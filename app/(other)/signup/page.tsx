import Breadcrumb from "@/components/breadcrumb";
import Signup from "@/components/signup";
import Subscribe from "@/components/subscribe";

export default function SignupPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-hwseta-green-muted/40">
            <Breadcrumb breadcrumbTitle="Register" />
            <Signup />
            <Subscribe />
        </div>
    );
}
