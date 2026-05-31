import Document, { Head, Html, Main, NextScript } from "next/document";

class ShellDocument extends Document {
  static async getInitialProps(ctx: Parameters<typeof Document.getInitialProps>[0]) {
    const initialProps = await Document.getInitialProps(ctx);
    return initialProps;
  }

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default ShellDocument;
