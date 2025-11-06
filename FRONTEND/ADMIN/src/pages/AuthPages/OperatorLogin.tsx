  import PageMeta from "../../components/common/PageMeta";
  import AuthLayout from "./AuthPageLayout";
  import OperatorSigninForm from "../../components/auth/OperatorSigninForm";

  export default function OperatorLogin() {
    return (
      <>
        <PageMeta
          title="React.js Operator Login | TailAdmin - Next.js Admin Dashboard Template"
          description="This is React.js Operator Login page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
        />
        <AuthLayout>
          <OperatorSigninForm />
        </AuthLayout>
      </>
    );
  }
