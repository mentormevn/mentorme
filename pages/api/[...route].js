import { handleApiRequest } from "../../lib/server/api";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

export default async function handler(req, res) {
  await handleApiRequest(req, res);
}
