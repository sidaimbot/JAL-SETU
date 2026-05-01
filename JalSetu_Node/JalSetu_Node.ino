#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <LoRa.h>

// --- Pin Definitions ---
#define BUZZER_PIN 13
#define LED_PIN 4        
#define WATER_SENSOR_PIN 34
#define GPS_RX 16
#define GPS_TX 17
// LoRa Pins
#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 26

// --- Timing Variables ---
unsigned long previousLoRaTime = 0;
unsigned long previousSerialTime = 0;
const long loraInterval = 2000;   // 2 seconds
const long serialInterval = 3000; // 3 seconds

// --- Network & Server Setup ---
const byte DNS_PORT = 53;
IPAddress apIP(192, 168, 4, 1);
DNSServer dnsServer;
WebServer server(80);

// --- Objects ---
TinyGPSPlus gps;

// --- Global Data Variables ---
int waterLevelPercent = 0;
int rainIntensity = 0; 
String alertStatus = "Normal";

// --- HTML Dashboard ---
const char* DASHBOARD_HTML = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <meta name="theme-color" content="#0a0a0a">
  <title>FLOOD ALERT</title>
  
  <style>
    :root { --s: #00e676; --w: #ffea00; --d: #ff1744; --bg: #0a0a0a; --c: #1e1e1e; --b: #2a2a2a; --t: #f0f0f0; --m: #888; --r: 12px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--t); padding-bottom: 80px; }
    
    /* Animations */
    @keyframes p-d { 0%, 100% { box-shadow: 0 0 24px var(--d); } 50% { box-shadow: 0 0 48px var(--d); } }
    @keyframes blk { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    @keyframes s-i { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes f-i { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    
    /* Header */
    h1 { font-weight: 800; font-size: 15px; }
    #h { position: sticky; top: 0; z-index: 9; background: #0d0d0d; border-bottom: 2px solid var(--b); padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; }
    #h span { display: block; font-size: 11px; font-weight: 400; color: var(--m); }
    #lt { display: flex; gap: 4px; }
    
    /* Language Buttons */
    .lb { padding: 5px 10px; border-radius: 20px; border: 1.5px solid var(--b); background: transparent; color: var(--m); font-size: 12px; font-weight: 600; cursor: pointer; }
    .lb.active { background: var(--t); color: #000; border-color: var(--t); }
    
    /* Status Banner */
    #sb { margin: 12px; border-radius: var(--r); padding: 22px 18px; text-align: center; animation: s-i 0.4s ease; position: relative; background: #002a14; min-height: 140px; }
    #sb.warning { background: #2a2200; }
    #sb.danger { background: #2a0010; animation: p-d 1.2s infinite; }
    #si { font-size: 44px; }
    #sl { font-size: 28px; font-weight: 900; text-transform: uppercase; }
    .warning #sl { color: var(--w); }
    .danger #sl { color: var(--d); animation: blk 0.8s infinite; }
    .safe #sl { color: var(--s); }
    #sm { font-size: 13px; color: rgba(255, 255, 255, 0.75); margin-top: 6px; }
    #lu { font-size: 10px; color: var(--m); margin-top: 8px; }
    #sd { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--s); margin-right: 4px; animation: blk 1.5s infinite; }
    
    /* Cards & Sections */
    .s { margin: 10px 12px 0; background: var(--c); border: 1px solid var(--b); border-radius: var(--r); overflow: hidden; animation: f-i 0.4s both; }
    .sh { padding: 12px 16px; background: #181818; border-bottom: 1px solid var(--b); font-size: 13px; font-weight: 700; color: #bbb; }
    .sb { padding: 14px 16px; }
    .sg { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .sc { background: #141414; border: 1px solid var(--b); border-radius: 10px; padding: 14px 12px; text-align: center; }
    .sl { font-size: 10px; color: var(--m); text-transform: uppercase; }
    .sv { font-size: 30px; font-weight: 900; margin: 4px 0; }
    
    /* Progress Bars */
    .pw { margin-top: 8px; background: #2a2a2a; border-radius: 20px; height: 8px; overflow: hidden; }
    .pb { height: 100%; transition: width 0.6s ease, background 0.5s; }
    
    /* Rows & Lists */
    .cr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .cl { font-size: 12px; color: var(--m); }
    .cv { font-size: 15px; font-weight: 700; font-family: monospace; }
    .sep { border: 0; border-top: 1px solid var(--b); margin: 8px 0; }
    .rc { background: #141414; border: 1px solid var(--b); border-radius: 10px; padding: 14px; margin-bottom: 10px; display: flex; gap: 12px; }
    .ra { font-size: 36px; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #0d0d0d; border-radius: 10px; border: 1px solid var(--b); }
    .ri { flex: 1; }
    .rn { font-weight: 700; font-size: 15px; }
    .rd { font-size: 11px; color: var(--m); line-height: 1.4; }
    .rba { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; background: #1a3a1a; color: var(--s); border: 1px solid rgba(0, 230, 118, 0.3); margin-top: 5px; }
    
    /* Map & Safety */
    .mc { background: #0d1a0d; border-radius: 10px; overflow: hidden; border: 1px solid rgba(0, 230, 118, 0.2); position: relative; }
    #map { width: 100%; height: 220px; display: block; }
    .sp { background: #1a0005; border: 2px solid rgba(255, 23, 68, 0.4); border-radius: var(--r); padding: 16px; }
    .st_i { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255, 23, 68, 0.15); }
    .st_i:last-child { border: 0; }
    .sk { font-size: 11px; font-weight: 800; color: var(--d); display: block; }
    .st { font-size: 13px; line-height: 1.5; color: #e0e0e0; }
    
    /* Contacts & Navigation */
    .cg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .cb { display: flex; flex-direction: column; align-items: center; padding: 14px 8px; background: #141414; border: 1px solid var(--b); border-radius: 10px; text-decoration: none; color: var(--t); }
    .cb:active { transform: scale(0.96); }
    #fn { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9; background: #0d0d0d; border-top: 1px solid var(--b); display: flex; height: 58px; }
    .nb { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--m); font-size: 10px; font-weight: 600; border: 0; background: transparent; }
    .nb.active { color: var(--t); }
    .p { display: none; }
    .p.active { display: block; }
    .rw { margin-bottom: 10px; }
  </style>
</head>
<body>
  <header id="h">
    <div id="ht">🌊 FLOOD ALERT<span id="hsub"></span></div>
    <div id="lt">
      <button class="lb active" onclick="setL('en')">EN</button>
      <button class="lb" onclick="setL('hi')">हि</button>
      <button class="lb" onclick="setL('mr')">मर</button>
    </div>
  </header>
  
  <div id="sb" class="safe">
    <div class="rw"><div id="si">✅</div></div>
    <div id="sl">SAFE</div>
    <div id="sm"></div>
    <div id="lu"><span id="sd"></span><span id="ut"></span></div>
  </div>
  
  <nav id="fn"></nav>
  <main id="m"></main>

  <script>
    const LANGS = {
      en: { 
        n: ["Status", "Map", "Safety", "Help"], 
        h: "Flood Warning System", 
        s: ["SAFE", "WARNING", "DANGER"], 
        m: ["Normal conditions.", "Rising levels. Prepare.", "CRITICAL: Evacuate NOW!"], 
        l: ["Live Sensor Data", "Location", "Escape Routes", "Contacts"], 
        o: ["Water", "Rain", "Lat", "Long", "Place", "🌐 Open Google Maps"], 
        r: [["Primary School", "200m North", "Higher ground"], 
            ["Relief Camp", "500m NE", "Main Highway"], 
            ["Hospital", "1.2km West", "Elevated"]], 
        si: [["EVACUATE", "Move to higher ground."], 
             ["AVOID", "No walking/driving in water."], 
             ["POWER", "Turn off electricity."], 
             ["SHELTER", "Go to highest floor."], 
             ["WATER", "Drink bottled water only."], 
             ["EMERGENCY", "Inform relatives."], 
             ["KIDS/ELDERLY", "Prioritize them."], 
             ["WILDLIFE", "Watch for snakes."]], 
        c: ["Police", "Ambulance", "NDRF", "Helpline"] 
      },
      hi: { 
        n: ["स्थिति", "नक्शा", "सुरक्षा", "संपर्क"], 
        h: "बाढ़ चेतावनी प्रणाली", 
        s: ["सुरक्षित", "चेतावनी", "खतरा"], 
        m: ["सामान्य स्थिति।", "स्तर बढ़ रहा है। तैयार रहें।", "गंभीर: तुरंत निकलें!"], 
        l: ["सेंसर डेटा", "स्थान", "बचाव मार्ग", "संपर्क"], 
        o: ["जल स्तर", "वर्षा", "अक्षांश", "देशांतर", "स्थान", "🌐 गूगल मैप्स खोलें"], 
        r: [["प्राथमिक विद्यालय", "200m उत्तर", "ऊंची जमीन"], 
            ["राहत शिविर", "500m उत्तर-पूर्व", "राजमार्ग"], 
            ["अस्पताल", "1.2km पश्चिम", "ऊंचाई पर"]], 
        si: [["निकासी", "तुरंत ऊंची जमीन पर जाएं।"], 
             ["बचाव", "पानी में न चलें/गाड़ी चलाएं।"], 
             ["बिजली", "मुख्य स्विच बंद करें।"], 
             ["आश्रय", "सबसे ऊंची मंजिल पर जाएं।"], 
             ["पानी", "केवल बोतल का पानी पियें।"], 
             ["संचार", "परिजनों को सूचित करें।"], 
             ["कमजोर वर्ग", "बच्चों/बुजुर्गों का ध्यान दें।"], 
             ["खतरा", "सांपों से सावधान रहें।"]], 
        c: ["पुलिस", "एम्बुलेंस", "NDRF", "हेल्पलाइन"] 
      },
      mr: { 
        n: ["स्थिती", "नकाशा", "सुरक्षा", "संपर्क"], 
        h: "पूर पूर्वसूचना प्रणाली", 
        s: ["सुरक्षित", "सावधान", "धोका"], 
        m: ["सर्व सामान्य।", "पातळी वाढत आहे।", "गंभीर: ताबडतोब स्थलांतर करा!"], 
        l: ["सेन्सर डेटा", "स्थान", "निर्गमन मार्ग", "संपर्क"], 
        o: ["जल पातळी", "पाऊस", "अक्षांश", "रेखांश", "ठिकाण", "🌐 गूगल मॅप्स उघडा"], 
        r: [["प्राथमिक शाळा", "200m उत्तर", "उंच जमीन"], 
            ["मदत शिबिर", "500m ईशान्य", "महामार्ग"], 
            ["रुग्णालय", "1.2km पश्चिम", "उंच ठिकाणी"]], 
        si: [["स्थलांतर", "ताबडतोब उंच ठिकाणी जा."], 
             ["बचाव", "पाण्यातून जाऊ नका."], 
             ["वीज", "वीज पुरवठा बंद करा."], 
             ["आश्रय", "सर्वात वरच्या मजल्यावर जा."], 
             ["पाणी", "बाटलीबंद पाणी वापरा."], 
             ["संपर्क", "नातेवाईकांना कळवा."], 
             ["प्राधान्य", "वृद्ध आणि मुलांची काळजी घ्या."], 
             ["धोका", "सापांपासून सावध राहा."]], 
        c: ["पोलीस", "रुग्णवाहिका", "NDRF", "हेल्पलाइन"] 
      }
    };

    let cL = 'en', stat = 'safe', wl = 0, ri = 0, lat = 0, lon = 0, pN = "--";
    
    const $ = id => document.getElementById(id);
    const setL = l => { cL = l; applyL(); };
    
    const showT = id => {
      document.querySelectorAll('.p').forEach(p => p.classList.toggle('active', p.id === id));
      document.querySelectorAll('.nb').forEach(b => b.classList.toggle('active', b.getAttribute('onclick').includes(id)));
    };

    function applyL() {
      const t = LANGS[cL];
      $('hsub').textContent = t.h;
      $('ut').textContent = (cL === 'en' ? 'LIVE' : (cL === 'hi' ? 'लाइव' : 'लाईव्ह')) + ' ' + new Date().toLocaleTimeString();
      uS();
      renderM();
    }

    function uS() {
      const t = LANGS[cL];
      const b = $('sb');
      b.className = stat;
      $('si').textContent = stat === 'safe' ? '✅' : (stat === 'warning' ? '⚠️' : '🚨');
      $('sl').textContent = t.s[stat === 'safe' ? 0 : (stat === 'warning' ? 1 : 2)];
      $('sm').textContent = t.m[stat === 'safe' ? 0 : (stat === 'warning' ? 1 : 2)];
    }

    function renderM() {
      const t = LANGS[cL];
      $('fn').innerHTML = t.n.map((n, i) => `
        <button class="nb ${i === 0 ? 'active' : ''}" onclick="showT('t${i}')">
          <span style="font-size:20px">${['📡', '🗺', '📘', '📞'][i]}</span>
          <span>${n}</span>
        </button>`).join('');
        
      $('m').innerHTML = `
      <div id="t0" class="p active">
        <div class="s">
          <div class="sh">📊 ${t.l[0]}</div>
          <div class="sb">
            <div class="sg">
              <div class="sc">
                <div class="sl">${t.o[0]}</div>
                <div class="sv" id="wv" style="color:var(--s)">--</div>
                <div>%</div>
                <div class="pw"><div class="pb" id="wb"></div></div>
              </div>
              <div class="sc">
                <div class="sl">${t.o[1]}</div>
                <div class="sv" id="rv" style="color:var(--s)">--</div>
                <div>mm/h</div>
                <div class="pw"><div class="pb" id="rb"></div></div>
              </div>
            </div>
          </div>
        </div>
        <div class="s">
          <div class="sh">📍 ${t.l[1]}</div>
          <div class="sb">
            <div class="cr"><span class="cl">${t.o[4]}</span><span class="cv" id="pv">${pN}</span></div><hr class="sep">
            <div class="cr"><span class="cl">${t.o[2]}</span><span class="cv" id="ltv">--</span></div><hr class="sep">
            <div class="cr"><span class="cl">${t.o[3]}</span><span class="cv" id="lnv">--</span></div>
            <button onclick="oGM()" style="width:100%;margin-top:12px;padding:12px;background:#4285F4;color:#fff;border:0;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer">${t.o[5]}</button>
          </div>
        </div>
        <div class="s">
          <div class="sh">🚶 ${t.l[2]}</div>
          <div class="sb">
            ${t.r.map(r => `
              <div class="rc">
                <div class="ra">${['⬆️', '↗️', '⬅️'][t.r.indexOf(r)]}</div>
                <div class="ri">
                  <div class="rn">${r[0]}</div>
                  <div class="rd">${r[1]} • ${r[2]}</div>
                  <span class="rb">✅ SAFE</span>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>
      
      <div id="t1" class="p">
        <div class="s">
          <div class="sh">🗺 ${t.n[1]}</div>
          <div class="sb">
            <div class="mc">
              <svg id="map" viewBox="0 0 360 240">
                <defs>
                  <radialGradient id="g1">
                    <stop offset="0%" stop-color="#00e676" stop-opacity=".3"/>
                    <stop offset="100%" stop-color="#00e676" stop-opacity="0"/>
                  </radialGradient>
                </defs>
                <rect width="360" height="240" fill="#0d100d"/>
                <circle cx="180" cy="120" r="100" fill="none" stroke="#222" stroke-width="1"/>
                <circle cx="180" cy="120" r="60" fill="none" stroke="#222" stroke-width="1"/>
                <line x1="180" y1="20" x2="180" y2="220" stroke="#222"/>
                <line x1="80" y1="120" x2="280" y2="120" stroke="#222"/>
                <path d="M180 120 L180 40M180 120 L240 60M180 120 L80 120" stroke="#00e676" stroke-width="2" stroke-dasharray="4 3" opacity=".6"/>
                <circle cx="180" cy="40" r="18" fill="url(#g1)"/>
                <circle cx="180" cy="40" r="4" fill="#00e676"/>
                <text x="180" y="32" fill="#00e676" font-size="8" text-anchor="middle" font-weight="700">${t.r[0][0]}</text>
                <circle cx="240" cy="60" r="18" fill="url(#g1)"/>
                <circle cx="240" cy="60" r="4" fill="#00e676"/>
                <text x="245" y="52" fill="#00e676" font-size="8" font-weight="700">${t.r[1][0]}</text>
                <circle cx="80" cy="120" r="18" fill="url(#g1)"/>
                <circle cx="80" cy="120" r="4" fill="#00e676"/>
                <text x="80" y="112" fill="#00e676" font-size="8" text-anchor="middle" font-weight="700">${t.r[2][0]}</text>
                <rect x="100" y="180" width="160" height="30" fill="#2a0005" stroke="#ff1744" stroke-width="1" rx="4" opacity=".6"/>
                <text x="180" y="198" fill="#ff1744" font-size="9" text-anchor="middle" font-weight="700">⚠️ FLOOD ZONE</text>
                <circle cx="180" cy="120" r="6" fill="#ff1744"/>
                <circle cx="180" cy="120" r="12" fill="none" stroke="#ff1744" stroke-width="2">
                  <animate attributeName="r" from="6" to="18" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="1" to="0" dur="1.5s" repeatCount="indefinite"/>
                </circle>
                <text x="180" y="232" fill="#555" font-size="8" text-anchor="middle">N ↑</text>
              </svg>
            </div>
            <button onclick="oGM()" style="width:100%;margin-top:10px;padding:12px;background:#4285F4;color:#fff;border:0;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer">${t.o[5]}</button>
            <div style="margin-top:10px;font-size:10px;color:rgba(255,255,255,.5);background:#1a1a1a;padding:8px;border-radius:6px">
              📌 Offline scale: 1cm ≈ 100m. Map works without internet. Google Maps button requires cellular data.
            </div>
          </div>
        </div>
      </div>
      
      <div id="t2" class="p">
        <div class="s">
          <div class="sh">📘 ${t.n[2]}</div>
          <div class="sb">
            <div class="sp">
              ${t.si.map(s => `
                <div class="st_i">
                  <span style="font-size:22px">⚠️</span>
                  <div>
                    <span class="sk">${s[0]}</span>
                    <span class="st">${s[1]}</span>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <div id="t3" class="p">
        <div class="s">
          <div class="sh">📞 ${t.n[3]}</div>
          <div class="sb">
            <div class="cg">
              ${[['🚔', t.c[0], '100', 'var(--d)'], 
                 ['🚑', t.c[1], '108', 'var(--d)'], 
                 ['🆘', t.c[2], '1078', 'var(--w)'], 
                 ['☎️', t.c[3], '1800', 'var(--s)']].map(c => `
                <a class="cb" href="tel:${c[2]}">
                  <span>${c[0]}</span>
                  <span style="font-size:11px">${c[1]}</span>
                  <span style="font-size:18px;font-weight:800;color:${c[3]}">${c[2]}</span>
                </a>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
      uV();
    }

    function uV() {
      const wc = wl >= 80 ? 'var(--d)' : (wl >= 50 ? 'var(--w)' : 'var(--s)');
      const rc = ri >= 75 ? 'var(--d)' : (ri >= 45 ? 'var(--w)' : 'var(--s)');
      
      if ($('wv')) {
        $('wv').textContent = Math.round(wl); 
        $('wv').style.color = wc;
        $('wb').style.width = wl + '%'; 
        $('wb').style.background = wc;
        
        $('rv').textContent = Math.round(ri); 
        $('rv').style.color = rc;
        $('rb').style.width = Math.min(ri, 100) + '%'; 
        $('rb').style.background = rc;
        
        $('ltv').textContent = lat.toFixed(4); 
        $('lnv').textContent = lon.toFixed(4);
        $('pv').textContent = pN;
      }
    }

    function oGM() { 
      window.open('https://www.google.com/maps?q=' + lat + ',' + lon); 
    }

    function poll() {
      fetch('/data')
        .then(r => r.json())
        .then(d => {
          wl = d.water_level || 0; 
          ri = d.rain_intensity || 0;
          lat = d.latitude || lat; 
          lon = d.longitude || lon; 
          pN = d.place || pN;
          
          stat = wl >= 80 || ri >= 75 ? 'danger' : (wl >= 50 || ri >= 45 ? 'warning' : 'safe');
          uS(); 
          uV();
        })
        .catch(e => console.error(e));
    }
    
    window.onload = () => { 
      applyL(); 
      setInterval(poll, 3000); 
    };
  </script>
</body>
</html>
)rawliteral";

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX); // GPS Serial
  
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);      
  digitalWrite(BUZZER_PIN, LOW); 
  digitalWrite(LED_PIN, LOW);    

  // --- LoRa Setup ---
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(433E6)) { 
    Serial.println("LoRa failed!");
  } else {
    Serial.println("LoRa OK!");
  }

  // --- WiFi Access Point Setup ---
  WiFi.mode(WIFI_AP);
  WiFi.softAP("EMERGENCY_RESCUE_NET"); // Open network, no password
  delay(100);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));

  // --- Captive Portal DNS ---
  dnsServer.start(DNS_PORT, "*", apIP);

  // --- Web Server Routes ---
  server.on("/", []() {
    server.send(200, "text/html", DASHBOARD_HTML); 
  });

  server.on("/data", []() {
    String json = generateJSON();
    server.send(200, "application/json", json);
  });

  // --- BULLETPROOF CAPTIVE PORTAL REDIRECTS ---
  server.on("/generate_204", []() {
    server.sendHeader("Location", "http://192.168.4.1/", true);
    server.send(302, "text/plain", "");
  });
  
  server.on("/hotspot-detect.html", []() {
    server.sendHeader("Location", "http://192.168.4.1/", true);
    server.send(302, "text/plain", "");
  });

  server.onNotFound([]() {
    server.sendHeader("Location", "http://192.168.4.1/", true);
    server.send(302, "text/plain", "");
  });

  server.begin();
  Serial.println("System Ready. Connect to WiFi: EMERGENCY_RESCUE_NET");
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Keep background services running
  dnsServer.processNextRequest();
  server.handleClient();
  
  // 2. Feed GPS Data
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }

  // 3. Read Water Level (UPDATED CALIBRATION)
  int rawWater = analogRead(WATER_SENSOR_PIN);
  // Serial.print("RAW SENSOR VALUE: "); 
  // Serial.println(rawWater); 
  
  int maxSubmergedValue = 2350; 
  waterLevelPercent = map(rawWater, 0, maxSubmergedValue, 0, 100);
  
  if (waterLevelPercent > 100) waterLevelPercent = 100;
  if (waterLevelPercent < 0) waterLevelPercent = 0;

  // 4. Calculate Rain Intensity dynamically based on Water Level
  rainIntensity = waterLevelPercent + 5;
  if (rainIntensity > 100) rainIntensity = 100; // Cap at 100%

  // 5. Alert Logic Status
  if (waterLevelPercent >= 80) {
    alertStatus = "DANGER";
  } else if (waterLevelPercent >= 60) {
    alertStatus = "WARNING";
  } else {
    alertStatus = "Normal";
  }

  // 6. Buzzer & LED Logic (90% threshold)
  if (waterLevelPercent >= 90) {
    digitalWrite(BUZZER_PIN, HIGH); 
    digitalWrite(LED_PIN, HIGH);    
  } else {
    digitalWrite(BUZZER_PIN, LOW);  
    digitalWrite(LED_PIN, LOW);     
  }

  // 7. Broadcast LoRa JSON every 2 seconds
  if (currentMillis - previousLoRaTime >= loraInterval) {
    previousLoRaTime = currentMillis;
    String payload = generateJSON();
    
    LoRa.beginPacket();
    LoRa.print(payload);
    LoRa.endPacket();
  }

  // 8. Print to Serial Monitor every 3 seconds
  if (currentMillis - previousSerialTime >= serialInterval) {
    previousSerialTime = currentMillis;
    
    Serial.println("--- SENSOR STATUS ---");
    Serial.print("Water Level: "); Serial.print(waterLevelPercent); Serial.println("%");
    Serial.print("Rain Intensity: "); Serial.print(rainIntensity); Serial.println("%");
    Serial.print("Alert Status: "); Serial.println(alertStatus);
    
    if (gps.location.isValid()) {
      Serial.print("GPS: ");
      Serial.print(gps.location.lat(), 6);
      Serial.print(", ");
      Serial.println(gps.location.lng(), 6);
    } else {
      Serial.println("GPS: Searching for satellites...");
    }
    Serial.println("---------------------");
  }
}

// --- Helper Function to Build JSON ---
String generateJSON() {
  StaticJsonDocument<256> doc; 
  
  doc["water_level"] = waterLevelPercent;
  doc["rain_intensity"] = rainIntensity;
  doc["place"] = "Agra Local Node"; 
  
  if (gps.location.isValid()) {
    doc["latitude"] = gps.location.lat();
    doc["longitude"] = gps.location.lng();
  } else {
    doc["latitude"] = 0.0;
    doc["longitude"] = 0.0;
  }

  String jsonString;
  serializeJson(doc, jsonString);
  return jsonString;
}