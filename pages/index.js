import Head from "next/head";

import LegacyPageView from "../components/LegacyPageView";
import { getLegacyPageBySlug } from "../lib/legacy-page";

export async function getStaticProps() {
  const page = await getLegacyPageBySlug("index");

  if (!page) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      page
    }
  };
}

export default function HomePage({ page }) {
  return (
    <>
      <Head>
        <title>{page.title}</title>
      </Head>
      <LegacyPageView page={page} />
    </>
  );
}
