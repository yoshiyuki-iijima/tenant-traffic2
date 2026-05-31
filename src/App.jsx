import { useState } from "react";
import {
  Clock, ArrowLeft, Users, Building2, Cloud, CloudRain, Sun,
  Train, AlertTriangle, CheckCircle2, TrendingUp, MapPin, Info, Activity,
} from "lucide-react";

/* ===== 現在時刻（デモ用に 11:10 固定） ===== */
const NOW_LABEL = "11:10";
const NOW_MIN = 11 * 60 + 10; // 670
const LAST_UPDATE = "11:00";

/* ===== ビル・ダミーデータ ===== */
const BUILDINGS = [
  {
    id: "shiodome",
    name: "汐留シティセンター",
    area: "汐留・新橋エリア",
    workers: 9000,
    base: [[660, 70], [675, 75], [690, 80]],
    hold: 80,
    weather: { cond: "曇り", temp: 18, humidity: 65, pop: 30 },
    trains: [
      { line: "都営大江戸線", status: "平常運転" },
      { line: "ゆりかもめ", status: "平常運転" },
      { line: "JR山手線・京浜東北線（新橋）", status: "平常運転" },
      { line: "東京メトロ銀座線", status: "平常運転" },
    ],
  },
  {
    id: "shinjuku",
    name: "新宿ミライナタワー",
    area: "新宿駅 新南口エリア",
    workers: 5000,
    base: [[660, 65], [675, 70], [690, 80]],
    hold: 80,
    weather: { cond: "雨", temp: 16, humidity: 80, pop: 90 },
    trains: [
      { line: "JR山手線", status: "平常運転" },
      { line: "JR中央線快速", status: "遅延（約10分）" },
      { line: "小田急線", status: "平常運転" },
      { line: "京王線", status: "平常運転" },
    ],
  },
  {
    id: "shibuya",
    name: "Shibuya Sakura Stage",
    area: "渋谷駅 桜丘エリア",
    workers: 11000,
    base: [[660, 55], [675, 60], [690, 70]],
    hold: 70,
    weather: { cond: "曇り", temp: 17, humidity: 70, pop: 40 },
    trains: [
      { line: "JR山手線", status: "平常運転" },
      { line: "JR埼京線", status: "運転見合わせ" },
      { line: "東急東横線", status: "平常運転" },
      { line: "東京メトロ半蔵門線・副都心線", status: "平常運転" },
    ],
  },
];

/* ===== ロジック ===== */
function getOccupancy(b, mins) {
  const [, p0] = b.base[0];
  const [t1, p1] = b.base[1];
  const [t2, p2] = b.base[2];
  const declineStart = 900; // 15:00
  if (mins < t1) return p0;
  if (mins < t2) return p1;
  if (mins < declineStart) return p2;
  const steps = Math.floor((mins - declineStart) / 15) + 1;
  return Math.max(0, b.hold - steps * 5);
}

const hasSuspension = (b) =>
  b.trains.some((t) => t.status.includes("見合わせ") || t.status.includes("不通"));

function getRank(rate, cond, susp) {
  if (susp) return "E";
  const cr = cond === "曇り" || cond === "雨";
  const sunny = cond === "晴れ";
  if (rate > 75 && cr) return "A";
  if ((rate >= 70 && rate <= 74 && cr) || (rate > 75 && sunny)) return "B";
  if (rate >= 60 && rate <= 69 && cr) return "C";
  if (rate >= 50 && rate <= 59 && cr) return "D";
  return "—";
}

const RANK_META = {
  A: { color: "#15803d", label: "最高", msg: "非常に高い来店需要。最大体制での仕込み・スタッフ増員を推奨します。" },
  B: { color: "#4d7c0f", label: "良好", msg: "高い来店需要が見込めます。通常より多めの仕込みを推奨します。" },
  C: { color: "#ca8a04", label: "標準", msg: "標準的な来店需要です。通常体制で対応可能です。" },
  D: { color: "#ea580c", label: "やや低", msg: "来店需要はやや低めです。仕込み・発注は控えめに調整しましょう。" },
  E: { color: "#b91c1c", label: "要注意", msg: "沿線で運転見合わせが発生。来店減の可能性があり、需要が読みにくい状況です。" },
  "—": { color: "#64748b", label: "判定外", msg: "現在の条件では標準ランク判定の対象外です。" },
};

function rateStyle(rate) {
  const t = Math.max(0, Math.min(100, rate)) / 100;
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  const r = lerp(255, 139), g = lerp(228, 0), b = lerp(235, 0);
  const main = `rgb(${r},${g},${b})`;
  const light = `rgb(${Math.min(255, r + 28)},${Math.min(255, g + 28)},${Math.min(255, b + 28)})`;
  const text = t > 0.45 ? "#ffffff" : "#7f1d1d";
  return { background: `linear-gradient(160deg, ${light}, ${main})`, color: text };
}

function WeatherIcon({ cond, size = 48 }) {
  if (cond === "雨") return <CloudRain size={size} />;
  if (cond === "曇り") return <Cloud size={size} />;
  return <Sun size={size} />;
}

function ClockBadge() {
  return (
    <div className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl">
      <Clock size={18} className="text-sky-300" />
      <span className="text-sm text-slate-300">現在時刻</span>
      <span className="text-2xl font-bold tabular-nums tracking-wide">{NOW_LABEL}</span>
    </div>
  );
}

function SelectScreen({ onSelect }) {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-7 py-4 bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-sky-500 p-2 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">テナントビル リアルタイムトラフィック</h1>
            <p className="text-xs text-slate-400">飲食店向け リアルタイム需要予測</p>
          </div>
        </div>
        <ClockBadge />
      </header>

      <div className="flex-1 px-7 py-6 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-700 mb-5 flex items-center gap-2">
          <Building2 size={20} className="text-sky-600" />
          モニタリングするオフィスビルを選択してください
        </h2>
        <div className="grid grid-cols-3 gap-5">
          {BUILDINGS.map((b) => {
            const rate = getOccupancy(b, NOW_MIN);
            const st = rateStyle(rate);
            return (
              <button
                key={b.id}
                onClick={() => onSelect(b.id)}
                className="text-left bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition overflow-hidden"
              >
                <div className="h-2" style={{ background: st.background }} />
                <div className="p-5">
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                    <MapPin size={13} /> {b.area}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 leading-snug mb-4 min-h-[3.2rem]">
                    {b.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users size={18} />
                      <span className="text-sm">就労者数</span>
                    </div>
                    <span className="text-xl font-bold text-slate-800 tabular-nums">
                      {b.workers.toLocaleString()}<span className="text-sm font-medium ml-0.5">人</span>
                    </span>
                  </div>
                  <div className="mt-4 text-center text-sm font-semibold text-sky-600">
                    ダッシュボードを開く →
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ b, onBack }) {
  const [showCriteria, setShowCriteria] = useState(false);
  const rate = getOccupancy(b, NOW_MIN);
  const people = Math.round(b.workers * rate / 100);
  const susp = hasSuspension(b);
  const rank = getRank(rate, b.weather.cond, susp);
  const meta = RANK_META[rank];
  const rs = rateStyle(rate);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-700 transition">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">{b.name}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin size={11} /> {b.area}
            </p>
          </div>
        </div>
        <ClockBadge />
      </header>

      <div className="flex-1 p-4 bg-slate-100 overflow-auto">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-5 rounded-2xl p-5 shadow-sm flex flex-col justify-between" style={rs}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-90">現在の出社割合</span>
              <TrendingUp size={20} className="opacity-80" />
            </div>
            <div className="text-center my-2">
              <div className="text-7xl font-black tabular-nums leading-none">{rate}<span className="text-4xl">%</span></div>
            </div>
            <div className="bg-black/15 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm opacity-90 mb-1">
                <Users size={16} /> ビル内就労推定人数
              </div>
              <div className="text-3xl font-bold tabular-nums">
                {people.toLocaleString()}<span className="text-base font-medium ml-1">人</span>
                <span className="text-sm font-normal opacity-80"> / {b.workers.toLocaleString()}人</span>
              </div>
            </div>
            <p className="text-xs opacity-80 mt-2 text-center">
              ビル側トラフィックデータ参照 ・ 15分毎更新 ・ 最終更新 {LAST_UPDATE}
            </p>
          </div>

          <div className="col-span-7 grid grid-rows-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 mb-3">現在の周辺天候</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-slate-700">
                  <div className="text-sky-500"><WeatherIcon cond={b.weather.cond} size={52} /></div>
                  <div>
                    <div className="text-3xl font-bold text-slate-800">{b.weather.cond}</div>
                    <div className="text-4xl font-black text-slate-800 tabular-nums">
                      {b.weather.temp}<span className="text-xl">℃</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
                    <div className="text-xs text-slate-500">湿度</div>
                    <div className="text-xl font-bold text-slate-700 tabular-nums">{b.weather.humidity}%</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
                    <div className="text-xs text-slate-500">降水確率</div>
                    <div className="text-xl font-bold text-slate-700 tabular-nums">{b.weather.pop}%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <Train size={16} /> 電車運行情報（最寄駅沿線）
                </h3>
                {susp ? (
                  <span className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle size={13} /> 不通箇所あり
                  </span>
                ) : (
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={13} /> 通常運行
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {b.trains.map((t) => {
                  const bad = t.status.includes("見合わせ") || t.status.includes("不通");
                  const warn = t.status.includes("遅延");
                  return (
                    <div
                      key={t.line}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                        bad ? "bg-red-50 border border-red-200" : "bg-slate-50"
                      }`}
                    >
                      <span className="text-slate-700 font-medium truncate">{t.line}</span>
                      <span className={`font-bold text-xs whitespace-nowrap ml-2 ${
                        bad ? "text-red-600" : warn ? "text-amber-600" : "text-green-600"
                      }`}>
                        {bad && <AlertTriangle size={12} className="inline mr-1 -mt-0.5" />}
                        {t.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-stretch">
            <div
              className="flex flex-col items-center justify-center px-8 py-5 text-white"
              style={{ background: meta.color }}
            >
              <span className="text-xs font-semibold opacity-90">集客ランク</span>
              <span className="text-6xl font-black leading-none my-1">{rank}</span>
              <span className="text-sm font-bold">{meta.label}</span>
            </div>
            <div className="flex-1 px-6 py-4 flex flex-col justify-center">
              <p className="text-slate-800 font-semibold mb-3">{meta.msg}</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  出社率 <b className="text-slate-800">{rate}%</b>
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  天候 <b className="text-slate-800">{b.weather.cond}</b>
                </span>
                <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  運行 <b className={susp ? "text-red-600" : "text-slate-800"}>{susp ? "不通あり" : "正常"}</b>
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowCriteria((v) => !v)}
              className="px-4 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition flex items-center"
            >
              <Info size={20} />
            </button>
          </div>
          {showCriteria && (
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-700 mb-1">集客ランク判定基準</p>
              <p><b className="text-green-700">A</b>：出社率75%超 ／ 曇り・雨 ／ 不通なし</p>
              <p><b className="text-lime-700">B</b>：出社率70〜74% ／ 曇り・雨 ／ 不通なし　または　出社率75%超 ／ 晴れ ／ 不通なし</p>
              <p><b className="text-yellow-600">C</b>：出社率60〜69% ／ 曇り・雨 ／ 不通なし</p>
              <p><b className="text-orange-600">D</b>：出社率50〜59% ／ 曇り・雨 ／ 不通なし</p>
              <p><b className="text-red-600">E</b>：沿線に不通箇所あり</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const b = BUILDINGS.find((x) => x.id === selected);

  return (
    <div className="min-h-screen w-full bg-slate-300 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-6xl bg-slate-900 rounded-3xl p-3 shadow-2xl">
        <div className="bg-slate-50 rounded-2xl overflow-hidden" style={{ minHeight: "560px" }}>
          {b ? (
            <Dashboard b={b} onBack={() => setSelected(null)} />
          ) : (
            <SelectScreen onSelect={setSelected} />
          )}
        </div>
      </div>
    </div>
  );
}