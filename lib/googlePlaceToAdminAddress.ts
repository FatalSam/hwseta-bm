import apiClient from '@/ultis/apiClient';

export type AddressComponent = { long_name: string; types: string[] };

export type GooglePlace = {
  formatted_address?: string;
  address_components?: AddressComponent[];
};

export type DropdownOption = { id?: number | string; name?: string; code?: string; postalCode?: string };

/** Fields merged into employer / training provider address draft */
export type AdminAddressPatch = Partial<{
  physicalAddress1: string;
  physicalAddress2: string;
  physicalAddress3: string;
  physicalAddressCode: string;
  provinceId: number;
  municipalityId: number;
  districtId: number;
  /** HW_Employers text address (API save) */
  province: string | null;
  municipality: string | null;
  district: string | null;
  area: string;
  code: string;
}>;

/** HW_Employers API text columns — keep in sync with physical lines / dropdown resolution */
function applyEmployerApiAddressTextFields(
  patch: AdminAddressPatch,
  ex: ExtractedSaAddress,
  labels: { province: string | null; municipality: string | null; district: string | null },
) {
  patch.province = labels.province;
  patch.municipality = labels.municipality;
  patch.district = labels.district;
  patch.area = (patch.physicalAddress2 ?? ex.suburb ?? '').trim();
  patch.code = (patch.physicalAddressCode ?? ex.code ?? '').trim();
}

function getComponent(components: AddressComponent[], types: string[]): string {
  return components.find((c) => types.some((t) => c.types.includes(t)))?.long_name || '';
}

function numId(id: unknown): number | undefined {
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  const n = Number(id);
  return Number.isFinite(n) ? n : undefined;
}

export type ExtractedSaAddress = {
  finalAddressLine1: string;
  addressLine2: string;
  province: string;
  municipality: string;
  areaDistrict: string;
  suburb: string;
  code: string;
  forceDistrictIdMinus1: boolean;
};

/**
 * Extract SA-style address strings from a Google Place (aligned with beneficiary profile logic).
 */
export function extractSaAddressFromGooglePlace(place: GooglePlace): ExtractedSaAddress | null {
  const components = place.address_components;
  if (!components?.length) return null;

  const streetNumber = getComponent(components, ['street_number']);
  const route = getComponent(components, ['route']);
  const addressLine1 =
    streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber || '';
  const addressLine2 = getComponent(components, ['subpremise']);
  const province = getComponent(components, ['administrative_area_level_1']);
  const municipality = getComponent(components, ['administrative_area_level_2']);

  const locality = getComponent(components, ['locality']);
  const sublocality = getComponent(components, ['sublocality']);
  const sublocalityLevel1 = getComponent(components, ['sublocality_level_1']);
  const neighborhood = getComponent(components, ['neighborhood']);
  const hadSuburbHint = Boolean(
    sublocalityLevel1 || neighborhood || (sublocality && locality && sublocality !== locality),
  );
  const hadAreaHint = Boolean(locality || sublocality);

  let areaDistrict = locality || sublocality || '';
  let suburb = sublocalityLevel1 || neighborhood || '';

  if (!suburb && sublocality && locality && sublocality !== locality) {
    suburb = sublocality;
    areaDistrict = locality;
  } else if (!suburb && sublocality && !locality) {
    suburb = sublocality;
    areaDistrict = '';
  } else if (areaDistrict && suburb && areaDistrict.toLowerCase() === suburb.toLowerCase()) {
    if (place.formatted_address) {
      const parts = place.formatted_address.split(',').map((p) => p.trim());
      if (parts.length >= 3) {
        const potentialSuburb = parts[1];
        const potentialDistrict = parts[2];
        if (
          potentialSuburb &&
          potentialDistrict &&
          potentialSuburb !== potentialDistrict &&
          !potentialSuburb.includes(',') &&
          !potentialDistrict.includes(',')
        ) {
          suburb = potentialSuburb;
          areaDistrict = potentialDistrict;
        }
      } else if (parts.length >= 2) {
        const potentialSuburb = parts[1];
        if (potentialSuburb && potentialSuburb !== areaDistrict && !potentialSuburb.includes(',')) {
          suburb = potentialSuburb;
        }
      }
    }
    if (areaDistrict && suburb && areaDistrict.toLowerCase() === suburb.toLowerCase()) {
      suburb = '';
    }
    if (areaDistrict && areaDistrict.includes(',')) areaDistrict = '';
    if (suburb && suburb.includes(',')) suburb = '';
  }

  const code = getComponent(components, ['postal_code']);
  areaDistrict = areaDistrict.split(',')[0].trim();
  suburb = suburb.split(',')[0].trim();

  let forceDistrictIdMinus1 = false;
  if (!suburb && areaDistrict && !hadSuburbHint) {
    suburb = areaDistrict;
    forceDistrictIdMinus1 = true;
  } else if (!areaDistrict && suburb && !hadAreaHint) {
    areaDistrict = suburb;
    forceDistrictIdMinus1 = true;
  }

  if (!forceDistrictIdMinus1 && areaDistrict && suburb && areaDistrict.toLowerCase() === suburb.toLowerCase()) {
    suburb = '';
  }

  const finalAddressLine1 =
    addressLine1 || (place.formatted_address ? place.formatted_address.split(',')[0] : '');

  return {
    finalAddressLine1,
    addressLine2,
    province,
    municipality,
    areaDistrict,
    suburb,
    code,
    forceDistrictIdMinus1,
  };
}

/**
 * Match HWSETA dropdown IDs using the same `/api/Dropdowns/*` chain as the beneficiary profile
 * `place_changed` handler (cascade: municipalities → districts → suburbs → postal codes).
 *
 * Mapping vs profile form:
 * - `physicalAddress1` = street (line 1)
 * - `physicalAddress3` = subpremise (Address line 2, like beneficiary `addressLine2`)
 * - `physicalAddress2` = suburb name (for suburb dropdown; matched to API when possible)
 */
export async function resolveAdminAddressPatch(
  place: GooglePlace,
  provinces: DropdownOption[],
): Promise<AdminAddressPatch> {
  const ex = extractSaAddressFromGooglePlace(place);
  if (!ex) return {};

  const forceDistrictIdMinus1 = ex.forceDistrictIdMinus1;

  const patch: AdminAddressPatch = {
    physicalAddress1: ex.finalAddressLine1,
    physicalAddress3: ex.addressLine2 || '',
    physicalAddressCode: ex.code || '',
    physicalAddress2: ex.suburb || '',
  };

  const textLabels = {
    province: ex.province.trim() || null,
    municipality: ex.municipality.trim() || null,
    district: null as string | null,
  };

  const provinceName = ex.province.trim();
  if (!provinceName) {
    applyEmployerApiAddressTextFields(patch, ex, textLabels);
    return patch;
  }

  const matchedProvince = provinces.find(
    (p) =>
      (p.name ?? '').toLowerCase().includes(provinceName.toLowerCase()) ||
      provinceName.toLowerCase().includes((p.name ?? '').toLowerCase()),
  );

  if (!matchedProvince?.id) {
    applyEmployerApiAddressTextFields(patch, ex, textLabels);
    return patch;
  }

  textLabels.province = String(matchedProvince.name ?? textLabels.province ?? '');

  const provinceId = numId(matchedProvince.id);
  if (provinceId != null) patch.provinceId = provinceId;

  if (forceDistrictIdMinus1) {
    patch.districtId = -1;
  }

  try {
    const municipalitiesRes = await apiClient.get(`/api/Dropdowns/municipalities?provinceId=${matchedProvince.id}`);
    const municipalitiesData: DropdownOption[] = Array.isArray(municipalitiesRes.data)
      ? municipalitiesRes.data
      : [];

    const muniTarget = ex.municipality.toLowerCase().trim();
    const matchedMunicipality = muniTarget
      ? municipalitiesData.find((m) => {
          const muniName = (m.name ?? '').toLowerCase();
          return muniName.includes(muniTarget) || muniTarget.includes(muniName);
        })
      : undefined;

    if (matchedMunicipality?.id != null) {
      const municipalityId = numId(matchedMunicipality.id);
      if (municipalityId != null) patch.municipalityId = municipalityId;
      textLabels.municipality = String(matchedMunicipality.name ?? '');

      const districtsRes = await apiClient.get(
        `/api/Dropdowns/districts?municipalityId=${matchedMunicipality.id}`,
      );
      const districtsData: DropdownOption[] = Array.isArray(districtsRes.data) ? districtsRes.data : [];

      if (forceDistrictIdMinus1) {
        patch.districtId = -1;
        applyEmployerApiAddressTextFields(patch, ex, textLabels);
        return patch;
      }

      const areaDistrictLower = ex.areaDistrict.toLowerCase().trim();
      const matchedDistrict = areaDistrictLower
        ? districtsData.find((d) => {
            const distName = (d.name ?? '').toLowerCase().trim();
            if (distName === areaDistrictLower) return true;
            if (distName.toUpperCase() === areaDistrictLower.toUpperCase()) return true;
            return distName.includes(areaDistrictLower) || areaDistrictLower.includes(distName);
          })
        : undefined;

      if (matchedDistrict?.id != null) {
        const districtId = numId(matchedDistrict.id);
        if (districtId != null) patch.districtId = districtId;
        textLabels.district = String(matchedDistrict.name ?? '');

        const suburbsRes = await apiClient.get(`/api/Dropdowns/suburbs?districtId=${matchedDistrict.id}`);
        const suburbsData: DropdownOption[] = Array.isArray(suburbsRes.data) ? suburbsRes.data : [];

        const suburbLower = ex.suburb.toLowerCase().trim();
        const matchedSuburb = suburbLower
          ? suburbsData.find((s) => {
              const subName = (s.name ?? '').toLowerCase().trim();
              return subName.includes(suburbLower) || suburbLower.includes(subName);
            })
          : undefined;

        if (matchedSuburb) {
          patch.physicalAddress2 = String(matchedSuburb.name ?? '');
          const postalRes = await apiClient.get(
            `/api/Dropdowns/postal-codes/by-suburb?suburbId=${matchedSuburb.id}`,
          );
          const postalCodesData = Array.isArray(postalRes.data) ? postalRes.data : [];
          if (postalCodesData.length > 0) {
            const pc = ex.code;
            const matchedPostalCode = postalCodesData.find(
              (p: { code?: string; postalCode?: string }) => p.code === pc || p.postalCode === pc,
            );
            if (matchedPostalCode) {
              patch.physicalAddressCode = String(matchedPostalCode.code ?? matchedPostalCode.postalCode ?? '');
            } else if (pc) {
              patch.physicalAddressCode = pc;
            }
          } else if (ex.code) {
            patch.physicalAddressCode = ex.code;
          }
        } else if (ex.suburb) {
          patch.physicalAddress2 = ex.suburb;
          if (ex.code) patch.physicalAddressCode = ex.code;
        }
      } else if (ex.areaDistrict) {
        patch.districtId = -1;
        patch.physicalAddress2 = ex.suburb || '';
        if (ex.code) patch.physicalAddressCode = ex.code;
      } else {
        patch.districtId = -1;
      }
    } else if (ex.municipality) {
      patch.districtId = -1;
      patch.physicalAddress2 = ex.suburb || '';
      if (ex.code) patch.physicalAddressCode = ex.code;
    } else {
      patch.districtId = -1;
    }
  } catch {
    /* keep patch with province + lines */
  }

  applyEmployerApiAddressTextFields(patch, ex, textLabels);
  return patch;
}
