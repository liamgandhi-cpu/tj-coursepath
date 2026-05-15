import axios from "axios";

const ENDPOINT   = "https://sisstudent.fcps.edu/SVUE/Service/PXPCommunication.asmx";
const SOAP_ACTION = "http://edupoint.com/webservices/ProcessWebServiceRequest";

async function soapCall(username, password, methodName) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ProcessWebServiceRequest xmlns="http://edupoint.com/webservices/">
      <userID>${username}</userID>
      <password>${password}</password>
      <skipLoginLog>1</skipLoginLog>
      <parent>0</parent>
      <webServiceHandleName>PXPWebServices</webServiceHandleName>
      <methodName>${methodName}</methodName>
      <paramStr>&lt;Parms&gt;&lt;childIntId&gt;0&lt;/childIntId&gt;&lt;/Parms&gt;</paramStr>
    </ProcessWebServiceRequest>
  </soap:Body>
</soap:Envelope>`;

  const resp = await axios.post(ENDPOINT, body, {
    headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": SOAP_ACTION },
    timeout: 25000,
  });

  const match = resp.data.match(/<ProcessWebServiceRequestResult>([\s\S]*?)<\/ProcessWebServiceRequestResult>/);
  if (!match) throw new Error("Empty SOAP response");

  return match[1]
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"');
}

function attr(xml, name) {
  const m = xml.match(new RegExp(`<${name}>([^<]+)</${name}>`));
  return m ? m[1].trim() : null;
}

export default async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  const user = username.includes("@") ? username.split("@")[0] : username;

  try {
    const infoXml = await soapCall(user, password, "StudentInfo");
    if (infoXml.includes("RT_ERROR")) throw new Error("Invalid username or password");

    const grade = attr(infoXml, "Grade") || "9";
    const gradeNum = parseInt(grade) || 9;
    const name = attr(infoXml, "FormattedName") || user;

    const transcript = [];
    try {
      const gbXml = await soapCall(user, password, "Gradebook");

      for (const m of gbXml.matchAll(/Title="([^"]+)"/g)) {
        const raw = m[1].replace(/&amp;/g, "&");
        const codeMatch = raw.match(/^(.+?)\s+\(([A-Z0-9]{4,8})\)\s*$/);
        if (codeMatch) {
          transcript.push({ name: codeMatch[1].trim(), code: codeMatch[2], mark: "", credits: "", grade: gradeNum });
        } else {
          transcript.push({ name: raw, code: "", mark: "", credits: "", grade: gradeNum });
        }
      }
      console.log(`Gradebook: ${transcript.length} courses for grade ${gradeNum}`);
    } catch (e) {
      console.log("Gradebook failed:", e.message);
    }

    return res.json({
      success: true,
      student: { name, grade: String(gradeNum), school: "TJHSST", id: user },
      schedule: [],
      transcript,
    });

  } catch (err) {
    console.error("StudentVue error:", err.message);
    const isCredErr = /invalid|password|credential|unauthorized/i.test(err.message);
    return res.status(401).json({
      error: isCredErr ? "Invalid username or password." : "Login failed — try again.",
      detail: err.message,
    });
  }
};
