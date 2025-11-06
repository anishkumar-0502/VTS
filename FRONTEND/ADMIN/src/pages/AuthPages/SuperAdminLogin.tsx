import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SuperAdminLogin() {
  return (
    <>
      <PageMeta
        title="React.js SuperAdmin Login | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js SuperAdmin Login page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
