const form = document.querySelector("#builderForm");
const result = document.querySelector("#result");
const phoneScreen = document.querySelector("#phoneScreen");
const previewHeader = document.querySelector("#previewHeader");
const previewUrl = document.querySelector("#previewUrl");
const appNameInput = document.querySelector("#appName");
const websiteInput = document.querySelector("#websiteUrl");
const packageInput = document.querySelector("#packageId");
const primaryInput = document.querySelector("#primaryColor");
const accentInput = document.querySelector("#accentColor");
const backgroundInput = document.querySelector("#backgroundColor");

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 42);
}

function updatePreview() {
  const appName = appNameInput.value.trim() || "My Web App";
  const websiteUrl = websiteInput.value.trim() || "https://example.com";
  const primary = primaryInput.value;
  const accent = accentInput.value;
  const background = backgroundInput.value;

  previewHeader.textContent = appName;
  previewHeader.style.background = primary;
  previewUrl.textContent = websiteUrl;
  phoneScreen.style.background = background;
  document.querySelectorAll(".preview-lines span").forEach((line) => {
    line.style.background = `${accent}24`;
  });

  if (!packageInput.dataset.touched) {
    packageInput.value = `com.webtoapp.${slugify(appName) || "app"}`;
  }
}

[appNameInput, websiteInput, primaryInput, accentInput, backgroundInput].forEach((input) => {
  input.addEventListener("input", updatePreview);
});

packageInput.addEventListener("input", () => {
  packageInput.dataset.touched = "true";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  button.querySelector("span").textContent = "Generating...";
  result.className = "result-box";
  result.textContent = "Creating project files...";

  const formData = new FormData(form);
  const payload = {
    websiteUrl: formData.get("websiteUrl"),
    appName: formData.get("appName"),
    packageId: formData.get("packageId"),
    primaryColor: formData.get("primaryColor"),
    accentColor: formData.get("accentColor"),
    backgroundColor: formData.get("backgroundColor"),
    permissions: {
      camera: formData.has("camera"),
      microphone: formData.has("microphone"),
      location: formData.has("location"),
      storage: formData.has("storage")
    }
  };

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Project generation failed.");
    }

    result.className = "result-box success";
    result.innerHTML = `
      <strong>Project created:</strong><br />
      <code>${data.projectPath}</code><br /><br />
      <strong>Run:</strong><br />
      ${data.runCommands.map((command) => `<code>${command}</code>`).join("<br />")}<br /><br />
      <strong>Android APK build:</strong><br />
      <code>${data.buildCommand}</code>
    `;
  } catch (error) {
    result.className = "result-box error";
    result.textContent = error.message;
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "Generate app project";
  }
});

updatePreview();
