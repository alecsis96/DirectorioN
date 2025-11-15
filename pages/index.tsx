import type { GetServerSideProps } from "next";

const LegacyHome = () => null;

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: "/negocios",
    permanent: false,
  },
});

export default LegacyHome;
