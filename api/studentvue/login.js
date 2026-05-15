const { login } = require("studentvue");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

const FCPS_URL = "https://sisstudent.fcps.edu/";
const FCPS_SOAP = "https://sisstudent.fcps.edu/Service/PXPCommunication.asmx";

// Makes a raw SOAP request to StudentVue for methods not in the npm package (e.g. StudentCourseHistory)
async function rawRequest(username, password, methodName, paramStr) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ProcessWebServiceRequest xmlns="http://edupoint.com/webservices/">
      <userID>${username}</userID>
      <password>${password}</password>
      <skipLoginLog>1</skipLoginLog>
      <parent>0</parent>
      <webServiceHandleName>PXPWebServices</webServiceHandleName>
      <methodName>${methodName}</methodName>
      <paramStr>${paramStr || "&lt;Parms&gt;&lt;childIntId&gt;0&lt;/childIntId&gt;&lt;/Parms&gt;"}</paramStr>
    </ProcessWebServiceRequest>
  </soap:Body>
</soap:Envelope>`;

  const resp = await axios.post(FCPS_SOAP, body, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": "http://edupoint.com/webservices/ProcessWebServiceRequest",
    },
    timeout: 30000,
  });

  const outer = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const outerParsed = outer.parse(resp.data);
  const innerXml =
    outerParsed?.["soap:Envelope"]?.["soap:Body"]
      ?.ProcessWebServiceRequestResponse
      ?.ProcessWebServiceRequestResult;
  if (!innerXml) throw new Error("Empty SOAP response");

  const inner = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", isArray: () => false });
  return inner.parse(innerXml);
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  const cleanUser = username.includes("@") ? username.split("@")[0] : username;

  try {
    // Authenticate via the studentvue package
    const client = await login(FCPS_URL, { username: cleanUser, password });

    // Current-year courses from gradebook
    let schedule = [];
    try {
      const gradebook = await client.gradebook();
      schedule = (gradebook.courses || []).map(c => ({
        name: c.title,
        code: "",
        mark: c.marks?.[0]?.calculatedScore?.string || "",
      }));
    } catch (e) {
      console.log("Gradebook failed:", e.message);
    }

    // Course history via raw SOAP (not exposed by the npm package)
    let transcript = [];
    let maxGrade = 9;
    try {
      const data = await rawRequest(cleanUser, password, "StudentCourseHistory");
      const root = data?.StudentCourseHistory;
      let groups = root?.CourseHistoryGroup ?? [];
      if (!Array.isArray(groups)) groups = [groups];

      for (const group of groups) {
        const gradeNum = parseInt(group?.["@_Grade"] ?? "9");
        if (gradeNum > maxGrade) maxGrade = gradeNum;
        let courses = group?.CourseHistory ?? [];
        if (!Array.isArray(courses)) courses = [courses];

        for (const c of courses) {
          const name = c?.["@_CourseTitle"] || c?.["@_Title"] || "";
          const code = c?.["@_CourseID"] || c?.["@_ID"] || "";
          const mark = c?.["@_Mark"] || "";
          const credits = c?.["@_Credit"] || c?.["@_Credits"] || "";
          if (name) transcript.push({ name, code, mark, credits, grade: gradeNum });
        }
      }
      console.log(`Parsed ${transcript.length} transcript courses`);
    } catch (e) {
      console.log("Course history failed:", e.message);
    }

    return res.json({
      success: true,
      student: { name: cleanUser, grade: String(maxGrade), school: "TJHSST", id: cleanUser },
      schedule,
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
