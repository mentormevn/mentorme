import Head from "next/head";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Trang khong ton tai | Mentor Me</title>
      </Head>
      <main className="auth-page">
        <section className="auth-card" style={{ margin: "5rem auto" }}>
          <h1>Trang khong ton tai</h1>
          <p>Duong dan nay khong khop voi mot trang Mentor Me nao.</p>
          <a href="index.html" className="auth-submit-btn">
            Quay ve trang chu
          </a>
        </section>
      </main>
    </>
  );
}
