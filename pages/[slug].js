import Head from "next/head";

import LegacyPageView from "../components/LegacyPageView";
import { getLegacyPageBySlug, listLegacyPageSlugs } from "../lib/legacy-page";

export async function getStaticPaths() {
  const slugs = await listLegacyPageSlugs();

  return {
    paths: slugs.map((slug) => ({
      params: { slug }
    })),
    fallback: false
  };
}

export async function getStaticProps({ params }) {
  const page = await getLegacyPageBySlug(params.slug);

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

export default function LegacySlugPage({ page }) {
  return (
    <>
      <Head>
        <title>{page.title}</title>
      </Head>
      <LegacyPageView page={page} />
    </>
  );
}
