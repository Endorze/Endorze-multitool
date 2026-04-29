import "dotenv/config";

const CRON_SECRET = process.env.CRON_SECRET || "test";

async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/cron", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    console.log("CRON STATUS:", res.status);
    console.log("CRON CONTENT-TYPE:", contentType);
    console.log("CRON BODY:", text);
  } catch (err) {
    console.error("CRON ERROR:", err);
  }
}

run();
setInterval(run, 60 * 1000);

console.log("Dev cron started...");