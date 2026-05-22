import Breadcrumb from "@/components/breadcrumb";
import Signup from "@/components/signup";

export default function SignupPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-hwseta-green-muted/40">
            <Breadcrumb breadcrumbTitle="Register" />
            <Signup />
        </div>
    );
}
