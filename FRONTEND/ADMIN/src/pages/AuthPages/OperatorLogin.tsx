  import PageMeta from "../../components/common/PageMeta";
  import AuthLayout from "./AuthPageLayout";
  import OperatorSigninForm from "../../components/auth/OperatorSigninForm";

  export default function OperatorLogin() {
    return (
      <>
        <PageMeta
          title="Operator Login"
          description="This is a Operator Login page "
        />
        <AuthLayout>
          <OperatorSigninForm />
        </AuthLayout>
      </>
    );
  }
