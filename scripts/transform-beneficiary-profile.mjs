import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(
  __dirname,
  "..",
  "components",
  "beneficiary-profile",
  "BeneficiaryProfilePage.tsx"
);

let c = fs.readFileSync(target, "utf8");

c = c.replace(
  'import DashboardLayout from "@/components/dashboard-layout";\n',
  ""
);

c = c.replace(/\buser\?\.UserID\b/g, "user?.userID");
c = c.replace(/\buser\.UserID\b/g, "user.userID");

c = c.replace(
  "localStorage.getItem('auth')",
  "(sessionStorage.getItem('auth') || localStorage.getItem('auth'))"
);

const apiMap = [
  ["/api/municipalities?provinceid=", "/api/Dropdowns/municipalities?provinceId="],
  ["/api/districts?municipalityId=", "/api/Dropdowns/districts?municipalityId="],
  ["/api/suburbs?districtId=", "/api/Dropdowns/suburbs?districtId="],
  ["/api/postal-codes/by-suburb?suburbId=", "/api/Dropdowns/postal-codes/by-suburb?suburbId="],
  ["/api/genders", "/api/Dropdowns/genders"],
  ["/api/race-groups", "/api/Dropdowns/race-groups"],
  ["/api/residential-types", "/api/Dropdowns/residential-types"],
  ["/api/highest-education", "/api/Dropdowns/highest-education"],
  ["/api/provinces", "/api/Dropdowns/provinces"],
  ["/api/home-languages", "/api/Dropdowns/home-languages"],
  ["/api/countries", "/api/Dropdowns/countries"],
  ["/api/marital-statuses", "/api/Dropdowns/marital-statuses"],
  ["/api/yes-no", "/api/Dropdowns/yes-no"],
  ["/api/driver-licenses", "/api/Dropdowns/driver-licenses"],
  ["/api/employment-types", "/api/Dropdowns/employment-types"],
  ["/api/unemployment-reasons", "/api/Dropdowns/unemployment-reasons"],
  ["/api/salary-groups", "/api/Dropdowns/salary-groups"],
  ["/api/grant-types", "/api/Dropdowns/grant-types"],
];

for (const [from, to] of apiMap) {
  c = c.split(from).join(to);
}

const profileEffectStart = "  // Fetch profile state from API\n  useEffect(() => {";
const profileEffectEnd = "  }, [user, isAuthenticated, provinces]);";

const ps = c.indexOf(profileEffectStart);
const pe = c.indexOf(profileEffectEnd, ps);
if (ps === -1 || pe === -1) {
  console.error("Could not find profile useEffect block");
  process.exit(1);
}

const profileReplacement = `  // Beneficiary profile GET/save not wired yet (dropdowns use HWSETA /api/Dropdowns/* only).
  useEffect(() => {
    setIsLoadingProfile(false);
    setHasProfile(false);
  }, [isAuthenticated, user?.userID]);`;

c = c.slice(0, ps) + profileReplacement + c.slice(pe + profileEffectEnd.length);

const saveStart = "  const handleSaveProfile = async () => {";
const saveEndMarker = "  // Compress and resize image";
const ss = c.indexOf(saveStart);
const se = c.indexOf(saveEndMarker, ss);
if (ss === -1 || se === -1) {
  console.error("Could not find handleSaveProfile block");
  process.exit(1);
}

const saveReplacement = `  const handleSaveProfile = async () => {
    alert(
      "Saving your profile is not enabled yet. Only dropdown lists are loaded from the HWSETA API for now."
    );
  };

`;

c = c.slice(0, ss) + saveReplacement + c.slice(se);

const userResetStart = "  useEffect(() => {\n    if (!user?.userID) return;\n    setFormData(createEmptyFormData());";
const urs = c.indexOf(userResetStart);
if (urs !== -1) {
  const userResetReplacement = `  useEffect(() => {
    if (!user?.userID) return;
    setFormData({
      ...createEmptyFormData(),
      firstName: user.firstName || "",
      surname: user.lastName || "",
      emailAddress: user.email || "",
    });`;
  c = c.slice(0, urs) + userResetReplacement + c.slice(urs + userResetStart.length);
}

c = c.replace(
  "      <DashboardLayout>\n          <div className=\"mx-auto max-w-7xl px-6 py-8\">",
  "      <div className=\"mx-auto max-w-7xl px-6 py-8\">"
);
c = c.replace(
  "          </div>\n      </DashboardLayout>",
  "          </div>"
);

fs.writeFileSync(target, c);
console.log("Updated", target);
