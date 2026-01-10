import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SuperAdminLogin() {
  return (
    <>
      <PageMeta
        title="SuperAdmin Login"
        description="This is a SuperAdmin Login page "
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
