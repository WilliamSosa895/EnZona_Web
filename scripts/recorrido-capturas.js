// Recorrido de verificación de EnZona web con Playwright (Edge del sistema).
// Guarda capturas en D:\EnZonawebapp\docs\capturas y escribe un resumen JSON.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE = "http://localhost:3000";
const SALIDA = "D:/EnZonawebapp/docs/capturas";
fs.mkdirSync(SALIDA, { recursive: true });
const resumen = [];
const errores = [];

async function captura(page, nombre) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1300);
  const archivo = path.join(SALIDA, `${nombre}.png`);
  await page.screenshot({ path: archivo, fullPage: true });
  resumen.push({ nombre, url: page.url() });
  console.log("captura", nombre, page.url());
}

async function login(page, correo, personal = false) {
  await page.goto(`${BASE}/login${personal ? "?acceso=personal" : ""}`);
  await page.getByPlaceholder("Correo, teléfono o CURP").fill(correo);
  await page.getByPlaceholder("Contraseña").fill("enzona123");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

async function cerrarSesion(contexto) {
  await contexto.clearCookies();
}

(async () => {
  const navegador = await chromium.launch({ channel: "msedge" });
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 }, locale: "es-MX", timezoneId: "America/Mexico_City" });
  const page = await contexto.newPage();
  page.on("pageerror", (e) => errores.push({ url: page.url(), error: e.message }));
  page.on("console", (m) => { if (m.type() === "error") errores.push({ url: page.url(), consola: m.text().slice(0, 200) }); });

  // --- Público
  await page.goto(`${BASE}/login`);
  await captura(page, "d01_login");
  await page.goto(`${BASE}/registro`);
  await captura(page, "d02_registro");
  await page.goto(`${BASE}/`);
  await captura(page, "d03_inicio_sin_sesion");

  // --- Asistente
  await login(page, "asistente@uv.mx");
  await page.goto(`${BASE}/`);
  await captura(page, "d04_inicio");
  await page.goto(`${BASE}/?pago=gratis`);
  await captura(page, "d05_inicio_filtro_gratis");
  await page.goto(`${BASE}/evento/1`);
  await captura(page, "d06_detalle_gratuito");
  await page.goto(`${BASE}/evento/2`);
  await captura(page, "d07_detalle_pago");
  // cantidad 2 y asientos
  await page.getByRole("button", { name: "Agregar un boleto" }).click();
  await captura(page, "d08_detalle_2_boletos");
  await page.getByRole("link", { name: /Elegir 2 asientos/ }).click();
  await page.waitForURL(/asientos/);
  await page.waitForSelector('button[aria-label*="Asiento 3"]');
  await page.locator('button[aria-label^="Platea · Fila A · Asiento 5,"]').click();
  await page.locator('button[aria-label^="Platea · Fila A · Asiento 6,"]').click();
  await captura(page, "d09_asientos_2_de_2");
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
  await page.waitForURL(/pago/);
  await captura(page, "d10_pago");
  // pago rechazado
  await page.getByLabel("Respuesta de la pasarela").selectOption("tok_rechazado");
  await page.getByRole("button", { name: /^Pagar/ }).click();
  await page.waitForSelector("text=rechazó el pago", { timeout: 20000 });
  await captura(page, "d11_pago_rechazado");
  await page.getByLabel("Respuesta de la pasarela").selectOption("tok_aprobado");
  await page.getByRole("button", { name: /^Pagar/ }).click();
  await page.waitForURL(/orden\//, { timeout: 30000 });
  await captura(page, "d12_compra_confirmada");
  await page.getByRole("link", { name: /Boleto 2 de 2/ }).click();
  await page.waitForURL(/boleto\//);
  await captura(page, "d13_boleto_qr");
  await page.goto(`${BASE}/mis-boletos`);
  await captura(page, "d14_mis_boletos");
  await page.goto(`${BASE}/evento/1`);
  await page.getByRole("button", { name: "Confirmar asistencia" }).click();
  await page.waitForSelector("dialog[open]");
  await captura(page, "d15_dialogo_confirmar");
  await page.locator("dialog[open]").getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.waitForURL(/boleto\//, { timeout: 30000 });
  await captura(page, "d16_boleto_gratuito");
  await page.goto(`${BASE}/evento/1`);
  await captura(page, "d17_detalle_ya_tiene");
  await page.goto(`${BASE}/cuenta`);
  await captura(page, "d18_mi_cuenta");
  await cerrarSesion(contexto);

  // --- Organizador
  await login(page, "organizador@uv.mx", true);
  await captura(page, "d19_mis_eventos");
  await page.goto(`${BASE}/mis-eventos/2`);
  await captura(page, "d20_panel_evento");
  await page.goto(`${BASE}/mis-eventos/2/editar`);
  await captura(page, "d21_editar_evento");
  await page.goto(`${BASE}/mis-eventos/nuevo`);
  await captura(page, "d22_nuevo_evento");
  await page.goto(`${BASE}/mis-eventos/4`);
  await captura(page, "d23_panel_borrador");
  await cerrarSesion(contexto);

  // --- Validador
  await login(page, "validador@uv.mx", true);
  await page.waitForURL(/escanear/);
  await captura(page, "d24_validador");
  // validar por código escrito: boleto 2 (vigente de la compra de muestra)
  const respuesta = await page.request.get("http://localhost:8099/api/eventos/2/manifiesto", { headers: { Authorization: "Bearer x" } }).catch(() => null);
  void respuesta;
  await page.getByRole("button", { name: "Escribir código" }).click();
  await page.waitForSelector("dialog[open]");
  await captura(page, "d25_validador_escribir_codigo");
  await cerrarSesion(contexto);

  // --- Admin
  await login(page, "admin@uv.mx", true);
  await page.waitForURL(/admin/);
  await captura(page, "d26_admin_resumen");
  await page.goto(`${BASE}/admin/usuarios`);
  await captura(page, "d27_admin_usuarios");
  await page.goto(`${BASE}/admin/eventos`);
  await captura(page, "d28_admin_eventos");
  await cerrarSesion(contexto);

  // --- Móvil (390 px)
  const movil = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-MX", timezoneId: "America/Mexico_City" });
  const pm = await movil.newPage();
  pm.on("pageerror", (e) => errores.push({ url: pm.url(), error: e.message }));
  await pm.goto(`${BASE}/login`);
  await captura(pm, "m01_login");
  await login(pm, "asistente@uv.mx");
  await pm.goto(`${BASE}/`);
  await captura(pm, "m02_inicio");
  await pm.goto(`${BASE}/evento/2`);
  await captura(pm, "m03_detalle_pago");
  await pm.goto(`${BASE}/evento/2/asientos?tipo=2&cantidad=2`);
  await pm.waitForSelector('button[aria-label*="Asiento 7"]');
  await pm.locator('button[aria-label^="Platea · Fila B · Asiento 1,"]').click();
  await captura(pm, "m04_asientos_1_de_2");
  await pm.goto(`${BASE}/mis-boletos`);
  await captura(pm, "m05_mis_boletos");
  const primerBoleto = await pm.locator('a[href^="/boleto/"]').first().getAttribute("href");
  await pm.goto(`${BASE}${primerBoleto}`);
  await captura(pm, "m06_boleto");
  await pm.goto(`${BASE}/cuenta`);
  await captura(pm, "m07_cuenta");
  await movil.clearCookies();
  await login(pm, "validador@uv.mx", true);
  await pm.waitForURL(/escanear/);
  await captura(pm, "m08_validador");

  fs.writeFileSync(path.join(SALIDA, "resumen.json"), JSON.stringify({ capturas: resumen, errores }, null, 2));
  console.log("ERRORES:", JSON.stringify(errores, null, 2));
  await navegador.close();
})().catch(async (e) => {
  console.error("FALLO:", e.message);
  fs.writeFileSync(path.join(SALIDA, "resumen.json"), JSON.stringify({ capturas: resumen, errores, fallo: e.message }, null, 2));
  process.exit(1);
});
