"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows, Float } from "@react-three/drei";
import * as THREE from "three";

interface Agent {
  id: string;
  name: string;
  division: string;
  role: string;
  system_prompt?: string;
  position_x: number;
  position_y: number;
  position_z: number;
  status: string;
}

interface Waypoint {
  x: number;
  y: number;
  z: number;
  name: string;
}

// Warna Divisi Utama
const DIVISION_COLORS: Record<string, string> = {
  Executive: "#e11d48",
  Technology: "#2563eb",
  "Product & Design": "#9333ea",
  Marketing: "#16a34a",
  "Sales & BD": "#ea580c",
  "Finance & Legal": "#ca8a04",
  "HR & Operations": "#0d9488",
};

// Generator Penampilan Karakter
function getAgentAppearance(agent: Agent) {
  let hash = 0;
  for (let i = 0; i < agent.id.length; i++) {
    hash = agent.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash);

  const isFemale = agent.role === "CEO" ? false : h % 2 === 0;

  const skinTones = ["#f5d0a9", "#e0ac69", "#c68642", "#8d5524", "#ffdbac", "#f1c27d"];
  const hairColors = ["#1a1008", "#4a2c11", "#d4af37", "#a52a2a", "#800080", "#2c3e50", "#e74c3c"];
  const clothesTop = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0d9488", "#4f46e5", "#0284c7"];
  const clothesBottom = ["#334155", "#475569", "#1e293b", "#64748b", "#3b0764", "#701a75"];

  const femaleHairStyles = ["LONG_STRAIGHT", "PONYTAIL", "BOB_CUT", "BUN_UPDO", "CURLY_LONG"];
  const maleHairStyles = ["SHORT_CROP", "SLICK_BACK", "BUZZ_CUT", "CURLY_SHORT", "AFRO"];

  return {
    gender: isFemale ? "female" : "male",
    skinColor: skinTones[h % skinTones.length],
    hairColor: hairColors[(h >> 2) % hairColors.length],
    hairStyle: isFemale
      ? femaleHairStyles[(h >> 3) % femaleHairStyles.length]
      : maleHairStyles[(h >> 3) % maleHairStyles.length],
    topColor: DIVISION_COLORS[agent.division] || clothesTop[h % clothesTop.length],
    bottomColor: clothesBottom[(h >> 4) % clothesBottom.length],
    shoeColor: isFemale ? "#1e293b" : "#451a03",
    hasGlasses: h % 3 === 0,
    hasBeard: !isFemale && h % 4 === 0,
    bottomType: isFemale && h % 2 === 0 ? "SKIRT" : "PANTS",
  };
}

// LOGIKA CERDAS RESPONS FORMAL & KONTEKSTUAL MANUSIAWI
function generateNaturalHumanResponse(agent: Agent, userMsg: string, allAgents: Agent[]): string {
  const lowerMsg = userMsg.toLowerCase();

  // Kata kunci penanda pertanyaan/instruksi formal
  const formalKeywords = [
    "laporan", "strategi", "analisis", "dokumen", "evaluasi", "proyeksi",
    "rekomendasi", "prosedur", "anggaran", "sop", "kontrak", "arsitektur",
    "audit", "rencana kerja", "roadmap", "kepatuhan", "metrik", "kpi",
    "risiko", "resiko", "kebijakan", "instruksi", "formal", "resmi",
    "proposal", "presentasi", "efisiensi", "tinjauan", "studi kelayakan"
  ];

  const isFormalQuery = formalKeywords.some((key) => lowerMsg.includes(key));

  // 1. Respon Formalitas jika pengguna mengajukan pertanyaan formal/bisnis
  if (isFormalQuery) {
    return `Yth. Bapak/Ibu,\n\nMenindaklanjuti permohonan/pertanyaan Anda mengenai "${userMsg}", berikut adalah tanggapan resmi dari Divisi ${agent.division} (${agent.role}):\n\n1. Tanggung Jawab Operasional Divisi:\n   ${agent.system_prompt || "Pelaksanaan tugas diselaraskan dengan standar operasional perusahaan yang berlaku."}\n\n2. Tindak Lanjut & Evaluasi:\n   Hal ini telah kami catat dalam agenda prioritas kerja divisi. Kami akan melakukan pengkajian mendalam serta menyusun dokumentasi/rekomendasi teknis sesuai Standar Operasional Prosedur (SOP).\n\nDemikian informasi ini kami sampaikan. Apabila terdapat hal yang memerlukan konfirmasi atau diskusi lebih lanjut, silakan sampaikan kembali.\n\nHormat kami,\n${agent.name}\n${agent.role} - Divisi ${agent.division}`;
  }

  // Cari pimpinan divisi dan CEO
  const divisionManager = allAgents.find(
    (a) => a.division === agent.division && (a.role === "Manager" || a.role === "CEO")
  );
  const ceo = allAgents.find((a) => a.role === "CEO" || a.division === "Executive");

  // 2. Pertanyaan seputar bos / pimpinan / atasan / CEO
  if (
    lowerMsg.includes("pimpinan") ||
    lowerMsg.includes("bos") ||
    lowerMsg.includes("atasan") ||
    lowerMsg.includes("head") ||
    lowerMsg.includes("lead") ||
    lowerMsg.includes("manajer") ||
    lowerMsg.includes("manager") ||
    lowerMsg.includes("ceo")
  ) {
    if (agent.role === "CEO") {
      return `Saya sendiri Pak Pakar yang memimpin perusahaan ini sebagai CEO. Namun, di tiap divisi ada manajer masing-masing yang bertanggung jawab atas operasional timnya.`;
    }

    if (lowerMsg.includes("bos besar") || lowerMsg.includes("ceo") || lowerMsg.includes("pemilik")) {
      return `Pimpinan utama perusahaan kami adalah ${ceo ? ceo.name : "Pak Pakar (CEO)"}. Sedangkan untuk divisi ${agent.division}, pimpinan langsungnya adalah ${divisionManager ? divisionManager.name : "Manager tim kami"}.`;
    }

    if (agent.role === "Manager") {
      return `Di divisi ${agent.division}, saya yang memimpin tim. Untuk tingkat perusahaan, seluruh manajer melapor langsung kepada ${ceo ? ceo.name : "Pak Pakar (CEO)"}.`;
    }

    return `Atasan langsung saya di divisi ${agent.division} adalah ${divisionManager ? divisionManager.name : "Manager tim kami"}, dan pimpinan tertinggi perusahaan adalah ${ceo ? ceo.name : "Pak Pakar (CEO)"}.`;
  }

  // 3. Pertanyaan seputar tim / rekan kerja
  if (
    lowerMsg.includes("teman") ||
    lowerMsg.includes("tim") ||
    lowerMsg.includes("siapa saja") ||
    lowerMsg.includes("siapa aja") ||
    lowerMsg.includes("anggota")
  ) {
    const team = allAgents.filter((a) => a.division === agent.division && a.id !== agent.id);
    const teamNames = team.map((a) => a.name).join(", ");
    return `Di divisi ${agent.division}, saya bekerjasama dengan ${teamNames}. Kami rutin berkoordinasi untuk menyelesaikan target kerja divisi.`;
  }

  // 4. Pertanyaan seputar kapabilitas / jobdesk / keahlian
  if (
    lowerMsg.includes("bisa apa") ||
    lowerMsg.includes("tugas") ||
    lowerMsg.includes("peran") ||
    lowerMsg.includes("bantu apa") ||
    lowerMsg.includes("jobdesk") ||
    lowerMsg.includes("keahlian")
  ) {
    const promptText = agent.system_prompt
      ? agent.system_prompt
          .replace(/Kamu adalah /g, "Saya ")
          .replace(/Menganalisis/g, "menganalisis")
          .replace(/Mengelola/g, "mengelola")
      : `fokus pada operasional tim ${agent.division}`;

    return `Halo, saya ${agent.name}, ${agent.role} di divisi ${agent.division}.\n\nTugas dan ruang lingkup kerja saya meliputi:\n• ${promptText}\n\nApakah ada topik spesifik terkait area ini yang ingin kita bahas?`;
  }

  // 5. Sapaan harian
  if (
    lowerMsg.includes("halo") ||
    lowerMsg.includes("hai") ||
    lowerMsg.includes("hi") ||
    lowerMsg.includes("pagi") ||
    lowerMsg.includes("siang") ||
    lowerMsg.includes("sore") ||
    lowerMsg.includes("malam")
  ) {
    return `Halo! Saya ${agent.name}. Ada yang bisa saya bantu atau diskusikan mengenai divisi ${agent.division} hari ini?`;
  }

  // 6. Tanya kabar / aktivitas
  if (lowerMsg.includes("apa kabar") || lowerMsg.includes("lagi apa") || lowerMsg.includes("sibuk")) {
    return `Kabar baik. Saat ini saya sedang meninjau beberapa tugas operasional untuk divisi ${agent.division}. Ada hal yang perlu saya bantu?`;
  }

  // 7. Ucapan terima kasih
  if (lowerMsg.includes("terima kasih") || lowerMsg.includes("makasih") || lowerMsg.includes("thanks")) {
    return `Sama-sama. Apabila memerlukan koordinasi lebih lanjut terkait divisi ${agent.division}, silakan hubungi saya kembali.`;
  }

  // 8. Respons umum
  return `Mengenai "${userMsg}", poin tersebut telah saya pahami. Saya akan berkoordinasi dengan tim di divisi ${agent.division} untuk menindaklanjutinya. Mohon informasikan apabila ada detail tambahan.`;
}

// Navigasi Waypoints Kantor (1 Lantai)
const WORKSPACES: Record<string, Waypoint> = {
  CANTEEN_TABLE_1_A: { x: -7.5, y: 0, z: 7.5, name: "Kantin Meja 1 (A) 🍽️" },
  CANTEEN_TABLE_1_B: { x: -6.0, y: 0, z: 7.5, name: "Kantin Meja 1 (B) 🍽️" },
  COFFEE_COUNTER: { x: -11.0, y: 0, z: 8.5, name: "Barista Coffee Counter ☕" },
  LOUNGE_AREA: { x: 8.5, y: 0, z: 8.5, name: "Lounge Santai 🛋️" },
};

// ==========================================
// 1. KOMPONEN RUANGAN DIVISI KHUSUS
// ==========================================
function EnclosedDivisionRoom({
  title,
  icon,
  color,
  position,
  size,
  children,
}: {
  title: string;
  icon: string;
  color: string;
  position: [number, number, number];
  size: [number, number];
  children?: React.ReactNode;
}) {
  const [w, d] = size;
  const h = 2.2;
  const wallThickness = 0.06;
  const doorWidth = 1.6;

  return (
    <group position={position}>
      {/* Ubin Karpet Divisi */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={color} transparent opacity={0.2} roughness={0.8} />
      </mesh>

      {/* DINDING BELAKANG */}
      <mesh position={[0, h / 2, -d / 2]}>
        <boxGeometry args={[w, h, wallThickness]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} roughness={0.05} metalness={0.8} />
      </mesh>
      <mesh position={[0, h, -d / 2]}>
        <boxGeometry args={[w + 0.08, 0.08, 0.08]} />
        <meshStandardMaterial color={color} metalness={0.8} />
      </mesh>

      {/* DINDING KIRI */}
      <mesh position={[-w / 2, h / 2, 0]}>
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} roughness={0.05} metalness={0.8} />
      </mesh>
      <mesh position={[-w / 2, h, 0]}>
        <boxGeometry args={[0.08, 0.08, d + 0.08]} />
        <meshStandardMaterial color={color} metalness={0.8} />
      </mesh>

      {/* DINDING KANAN */}
      <mesh position={[w / 2, h / 2, 0]}>
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} roughness={0.05} metalness={0.8} />
      </mesh>
      <mesh position={[w / 2, h, 0]}>
        <boxGeometry args={[0.08, 0.08, d + 0.08]} />
        <meshStandardMaterial color={color} metalness={0.8} />
      </mesh>

      {/* DINDING DEPAN (CELAH PINTU) */}
      <group position={[0, 0, d / 2]}>
        <mesh position={[-(w / 2 + doorWidth / 2) / 2, h / 2, 0]}>
          <boxGeometry args={[(w - doorWidth) / 2, h, wallThickness]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} roughness={0.05} />
        </mesh>
        <mesh position={[(w / 2 + doorWidth / 2) / 2, h / 2, 0]}>
          <boxGeometry args={[(w - doorWidth) / 2, h, wallThickness]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} roughness={0.05} />
        </mesh>
        <mesh position={[0, h - 0.2, 0]}>
          <boxGeometry args={[doorWidth, 0.4, wallThickness]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.25} />
        </mesh>
        <mesh position={[0, h, 0]}>
          <boxGeometry args={[w + 0.08, 0.08, 0.08]} />
          <meshStandardMaterial color={color} metalness={0.8} />
        </mesh>

        <Html position={[0, h + 0.25, 0.05]} center>
          <div
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-xl flex items-center gap-1.5 border border-white/20 select-none whitespace-nowrap"
            style={{ backgroundColor: color }}
          >
            <span>{icon}</span>
            <span>{title}</span>
          </div>
        </Html>
      </group>

      {children}
    </group>
  );
}

// ==========================================
// 2. RUANGAN DIVISI 1 LANTAI
// ==========================================
function AllDivisionRooms() {
  return (
    <group>
      <EnclosedDivisionRoom title="EXECUTIVE CEO SUITE" icon="👑" color="#e11d48" position={[0, 0, -7.0]} size={[8.0, 5.0]} />
      <EnclosedDivisionRoom title="TECHNOLOGY DIVISION" icon="💻" color="#2563eb" position={[-12.0, 0, -7.0]} size={[8.5, 5.0]} />
      <EnclosedDivisionRoom title="PRODUCT & DESIGN" icon="🎨" color="#9333ea" position={[12.0, 0, -7.0]} size={[8.5, 5.0]} />
      <EnclosedDivisionRoom title="SALES & BD DIVISION" icon="🚀" color="#ea580c" position={[-12.0, 0, 0.0]} size={[8.5, 5.0]} />
      <EnclosedDivisionRoom title="FINANCE & LEGAL" icon="⚖" color="#ca8a04" position={[0, 0, 0.0]} size={[8.0, 5.0]} />
      <EnclosedDivisionRoom title="HR & OPERATIONS" icon="👥" color="#0d9488" position={[12.0, 0, 0.0]} size={[8.5, 5.0]} />
      <EnclosedDivisionRoom title="MARKETING DIVISION" icon="📢" color="#16a34a" position={[0, 0, 7.0]} size={[8.0, 5.0]} />
    </group>
  );
}

// ==========================================
// 3. KARAKTER 3D DENGAN ANIMASI
// ==========================================
function DiverseSimsCharacter({
  agent,
  state,
  emote,
}: {
  agent: Agent;
  state: "WALKING" | "TYPING" | "SITTING" | "STANDING" | "EATING" | "DRINKING" | "CHATTING";
  emote?: string;
}) {
  const traits = useMemo(() => getAgentAppearance(agent), [agent]);

  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  const isFemale = traits.gender === "female";
  const isCEO = agent.role === "CEO";

  useFrame((threeState) => {
    const t = threeState.clock.getElapsedTime();

    if (state === "WALKING") {
      const legCycle = Math.sin(t * 9);
      if (leftLegRef.current) leftLegRef.current.rotation.x = legCycle * 0.55;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legCycle * 0.55;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -legCycle * 0.45;
      if (rightArmRef.current) rightArmRef.current.rotation.x = legCycle * 0.45;
      if (bodyRef.current) bodyRef.current.position.y = 0.48 + Math.abs(Math.sin(t * 18)) * 0.04;
    } else if (state === "TYPING" || state === "SITTING") {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.PI / 2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.PI / 2;
      if (state === "TYPING") {
        if (leftArmRef.current) leftArmRef.current.rotation.x = -1.1 + Math.sin(t * 18) * 0.06;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -1.1 + Math.cos(t * 18) * 0.06;
      } else {
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.6;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.6;
      }
      if (bodyRef.current) bodyRef.current.position.y = 0.22;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.1;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.1;
      if (bodyRef.current) bodyRef.current.position.y = 0.48 + Math.sin(t * 2) * 0.015;
    }
  });

  return (
    <group ref={bodyRef} position={[0, 0.48, 0]}>
      {emote && (
        <Float speed={3} rotationIntensity={0.2} floatIntensity={0.5}>
          <Html position={[0, 1.5, 0]} center>
            <div className="bg-white/95 text-slate-800 border-2 border-indigo-500 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg animate-bounce select-none whitespace-nowrap">
              {emote}
            </div>
          </Html>
        </Float>
      )}

      {/* Kepala */}
      <group ref={headRef} position={[0, 0.65, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial color={traits.skinColor} roughness={0.3} />
        </mesh>
        <mesh position={[-0.07, 0.02, 0.17]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.07, 0.02, 0.17]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* Torso */}
      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={isFemale ? [0.14, 0.16, 0.4, 16] : [0.2, 0.16, 0.42, 16]} />
        <meshStandardMaterial color={isCEO ? "#1e293b" : traits.topColor} roughness={0.3} />
      </mesh>

      {/* Lengan */}
      <group ref={leftArmRef} position={[-0.2, 0.42, 0]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.04, 0.22, 8, 16]} />
          <meshStandardMaterial color={isCEO ? "#1e293b" : traits.topColor} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.2, 0.42, 0]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.04, 0.22, 8, 16]} />
          <meshStandardMaterial color={isCEO ? "#1e293b" : traits.topColor} />
        </mesh>
      </group>

      {/* Kaki */}
      <group ref={leftLegRef} position={[-0.09, 0.08, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.045, 0.32, 8, 16]} />
          <meshStandardMaterial color={traits.bottomColor} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.09, 0.08, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.045, 0.32, 8, 16]} />
          <meshStandardMaterial color={traits.bottomColor} />
        </mesh>
      </group>
    </group>
  );
}

// ==========================================
// 4. MEJA KERJA STATIS
// ==========================================
function StaticWorkstationDesk({ color, isWorking }: { color: string; isWorking: boolean }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.38, -0.15]}>
        <boxGeometry args={[1.4, 0.06, 0.7]} />
        <meshStandardMaterial color="#fde68a" roughness={0.2} />
      </mesh>
      {[-0.65, 0.65].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.18, -0.15]}>
          <boxGeometry args={[0.06, 0.36, 0.6]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      ))}
      <group position={[0, 0.65, -0.38]}>
        <mesh castShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.32, 0.02]} />
          <meshStandardMaterial color="#0f172a" emissive={isWorking ? "#38bdf8" : "#0284c7"} emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// ==========================================
// 5. NAVIGASI AGEN OTONOM
// ==========================================
function AutonomousAgent3D({
  agent,
  isSelected,
  isBackendWorking,
  onSelect,
  onStatusUpdate,
}: {
  agent: Agent;
  isSelected: boolean;
  isBackendWorking: boolean;
  onSelect: (agent: Agent) => void;
  onStatusUpdate: (id: string, text: string) => void;
}) {
  const homeX = agent.position_x;
  const homeZ = agent.position_z;
  const chairZ = homeZ + 0.25;

  const [currentPos, setCurrentPos] = useState({ x: homeX, y: 0, z: chairZ });
  const [waypointQueue, setWaypointQueue] = useState<Waypoint[]>([]);
  const [animState, setAnimState] = useState<"WALKING" | "TYPING" | "SITTING" | "STANDING" | "EATING" | "DRINKING" | "CHATTING">("TYPING");
  const [emote, setEmote] = useState<string | undefined>(undefined);
  const [rotationY, setRotationY] = useState(Math.PI);

  const color = DIVISION_COLORS[agent.division] || "#64748b";

  useEffect(() => {
    const interval = setInterval(() => {
      if (isBackendWorking) {
        setWaypointQueue([{ x: homeX, y: 0, z: chairZ, name: "Meja Kerja 💼" }]);
        setAnimState("TYPING");
        setEmote("⚡ THINKING...");
        setRotationY(Math.PI);
        onStatusUpdate(agent.id, `${agent.name} sedang memproses instruksi AI...`);
        return;
      }

      if (Math.random() < 0.4) {
        const destinationOptions = [
          { dest: WORKSPACES.CANTEEN_TABLE_1_A, state: "EATING" as const, emote: "🍕 Makan Pizza", msg: "makan pizza di Kantin" },
          { dest: WORKSPACES.CANTEEN_TABLE_1_B, state: "CHATTING" as const, emote: "💬 Ngobrol Kantin", msg: "ngobrol santai di Kantin" },
          { dest: WORKSPACES.COFFEE_COUNTER, state: "STANDING" as const, emote: "☕ Pesan Kopi", msg: "memesan kopi di Barista Counter" },
          { dest: WORKSPACES.LOUNGE_AREA, state: "CHATTING" as const, emote: "🛋 Relax Lounge", msg: "bersantai di Lounge" },
        ];

        const chosen = destinationOptions[Math.floor(Math.random() * destinationOptions.length)];
        setWaypointQueue([chosen.dest]);
        setEmote(chosen.emote);
        onStatusUpdate(agent.id, `${agent.name} ${chosen.msg}`);

        setTimeout(() => {
          setWaypointQueue([{ x: homeX, y: 0, z: chairZ, name: "Meja Kerja 💼" }]);
          setEmote(undefined);
          onStatusUpdate(agent.id, `${agent.name} kembali ke meja kerja`);
        }, 10000);
      }
    }, 12000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, [isBackendWorking, homeX, homeZ, chairZ, agent.id, agent.name]);

  useFrame((_, delta) => {
    if (waypointQueue.length === 0) return;

    const target = waypointQueue[0];
    const dx = target.x - currentPos.x;
    const dz = target.z - currentPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.12) {
      const speed = 2.5 * delta;
      const nx = currentPos.x + (dx / dist) * Math.min(speed, dist);
      const nz = currentPos.z + (dz / dist) * Math.min(speed, dist);

      setCurrentPos({ x: nx, y: 0, z: nz });
      setRotationY(Math.atan2(dx, dz));
      setAnimState("WALKING");
    } else {
      setWaypointQueue((prev) => prev.slice(1));
      if (waypointQueue.length === 1) {
        if (target.x === homeX && target.z === chairZ) {
          setAnimState("TYPING");
          setRotationY(Math.PI);
        } else {
          setAnimState("SITTING");
        }
      }
    }
  });

  return (
    <group position={[currentPos.x, currentPos.y, currentPos.z]} rotation={[0, rotationY, 0]}>
      <group onClick={(e) => { e.stopPropagation(); onSelect(agent); }} scale={isSelected ? 1.15 : 1.0}>
        <DiverseSimsCharacter agent={agent} state={animState} emote={emote} />
      </group>

      <Html position={[0, 1.7, 0]} center>
        <div
          onClick={() => onSelect(agent)}
          className={`cursor-pointer text-slate-800 text-[10px] px-2.5 py-0.5 rounded-full shadow-md border whitespace-nowrap transition flex items-center gap-1 select-none ${
            isBackendWorking
              ? "bg-amber-100 border-amber-500 animate-pulse font-bold"
              : isSelected
              ? "bg-indigo-600 text-white border-white scale-110 font-bold"
              : "bg-white/90 border-slate-300 hover:scale-105 font-medium"
          }`}
        >
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }}></span>
          <span>{agent.name}</span>
        </div>
      </Html>
    </group>
  );
}

// ==========================================
// 6. STRUKTUR GEDUNG UTAMA (1 LANTAI)
// ==========================================
function BuildingStructure() {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[38, 26]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.1} metalness={0.05} />
      </mesh>
      <gridHelper args={[38, 26, "#cbd5e1", "#e2e8f0"]} position={[0, -0.04, 0]} />

      <mesh position={[0, 1.0, -13.0]}>
        <boxGeometry args={[38, 2.0, 0.1]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[0, 1.0, 13.0]}>
        <boxGeometry args={[38, 2.0, 0.1]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[-19.0, 1.0, 0]}>
        <boxGeometry args={[0.1, 2.0, 26]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
      <mesh position={[19.0, 1.0, 0]}>
        <boxGeometry args={[0.1, 2.0, 26]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// ==========================================
// 7. KOMPONEN UTAMA OFFICE CANVAS
// ==========================================
export default function OfficeCanvas() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<"brief" | "pribadi">("brief");
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<{ id: string; text: string; time: string }[]>([]);

  useEffect(() => {
    fetch("https://office-ai-backend.vercel.app/agents")
      .then((res) => res.json())
      .then((data) => {
        if (data.agents && data.agents.length > 0) setAgents(data.agents);
        else setAgents(get36FullMockAgents());
      })
      .catch(() => setAgents(get36FullMockAgents()));
  }, []);

  const get36FullMockAgents = (): Agent[] => [
    // Executive
    { id: "ceo-main", name: "Pak Pakar (CEO)", division: "Executive", role: "CEO", system_prompt: "Menganalisis strategi perusahaan skala besar, menentukan eksekusi antar divisi, dan menyusun laporan konsolidasi eksekutif.", position_x: 0.0, position_y: 0.0, position_z: -7.0, status: "Active" },

    // Technology Division
    { id: "tech-lead", name: "Alex (Tech Lead)", division: "Technology", role: "Manager", system_prompt: "Menganalisis arsitektur sistem, memecah brief teknis produk, dan mengkoordinasikan tim developer.", position_x: -13.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "fe-dev-1", name: "Siti (Frontend Dev)", division: "Technology", role: "Specialist", system_prompt: "Mengembangkan tampilan web interaktif, slicing UI/UX menggunakan React, Next.js, dan TailwindCSS.", position_x: -11.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "fe-dev-2", name: "Rian (Mobile Dev)", division: "Technology", role: "Specialist", system_prompt: "Mengembangkan aplikasi mobile cross-platform menggunakan Flutter dan React Native.", position_x: -9.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "be-dev-1", name: "Budi (Backend Dev)", division: "Technology", role: "Specialist", system_prompt: "Merancang API RESTful, arsitektur database, dan microservices menggunakan Python FastAPI.", position_x: -13.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "be-dev-2", name: "Dedi (DevOps Eng)", division: "Technology", role: "Specialist", system_prompt: "Mengelola server deployment, container Docker, Kubernetes, dan pipeline CI/CD otomatis.", position_x: -11.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "qa-eng", name: "Maya (QA Lead)", division: "Technology", role: "Specialist", system_prompt: "Melakukan pengujian fitur otomatis (automated testing), pengujian performa, dan memastikan kualitas software.", position_x: -9.5, position_y: 0.0, position_z: -6.0, status: "Active" },

    // Product & Design Division
    { id: "product-head", name: "Diana (Head of Product)", division: "Product & Design", role: "Manager", system_prompt: "Merancang dokumen PRD, prioritas fitur backlog, serta menyusun roadmap pengembangan produk.", position_x: 9.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "uiux-1", name: "Kevin (UI/UX Lead)", division: "Product & Design", role: "Specialist", system_prompt: "Membuat rancangan wireframe, prototype interaktif Figma, dan konsistensi Design System.", position_x: 11.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "uiux-2", name: "Nadia (UX Researcher)", division: "Product & Design", role: "Specialist", system_prompt: "Mengadakan user interview, usability testing, serta memetakan kebutuhan pengguna.", position_x: 13.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "design-3d", name: "Raka (3D Artist)", division: "Product & Design", role: "Specialist", system_prompt: "Membuat model 3D, animasi interaktif, dan visualisasi WebGL.", position_x: 9.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "graphic-des", name: "Sari (Graphic Designer)", division: "Product & Design", role: "Specialist", system_prompt: "Merancang aset grafik untuk materi promosi, banner, dan identitas visual perusahaan.", position_x: 11.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "scrum-master", name: "Bagas (Scrum Master)", division: "Product & Design", role: "Specialist", system_prompt: "Mengawal kelancaran siklus Sprint, daily standup, serta membantu tim mengatasi hambatan.", position_x: 13.5, position_y: 0.0, position_z: -6.0, status: "Active" },

    // Sales & BD Division
    { id: "sales-lead", name: "Hendra (VP of Sales)", division: "Sales & BD", role: "Manager", system_prompt: "Memimpin strategi B2B sales, negosiasi tingkat tinggi, dan pencapaian target revenue perusahaan.", position_x: -13.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "account-exec", name: "Lia (Account Executive)", division: "Sales & BD", role: "Specialist", system_prompt: "Melakukan demonstrasi produk ke calon klien, negosiasi penawaran, dan penutupan kontrak (deal closing).", position_x: -11.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "bizdev-1", name: "Reza (BizDev Manager)", division: "Sales & BD", role: "Specialist", system_prompt: "Mengeksplorasi kemitraan strategis baru, riset ekspansi bisnis, dan aliansi industri.", position_x: -9.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "cust-success", name: "Putri (Customer Success)", division: "Sales & BD", role: "Specialist", system_prompt: "Mengelola hubungan baik dengan klien pasca-penjualan, kepuasan pengguna, dan retensi akun.", position_x: -13.5, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "sales-dev", name: "Taufik (SDR Lead)", division: "Sales & BD", role: "Specialist", system_prompt: "Melakukan prospeksi awal leads, riset kontak potensial, dan kualifikasi calon pembeli.", position_x: -11.5, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "crm-spec", name: "Vina (CRM Specialist)", division: "Sales & BD", role: "Specialist", system_prompt: "Mengelola database CRM, otomatisasi pipeline sales, dan follow-up email calon klien.", position_x: -9.5, position_y: 0.0, position_z: 1.0, status: "Active" },

    // Finance & Legal Division
    { id: "fin-lead", name: "Bambang (CFO)", division: "Finance & Legal", role: "Manager", system_prompt: "Mengendalikan strategi keuangan, perencanaan anggaran, arus kas (cash flow), dan proyeksi finansial.", position_x: -2.0, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "accountant", name: "Yuni (Senior Accountant)", division: "Finance & Legal", role: "Specialist", system_prompt: "Menyusun pembukuan jurnal harian, laporan laba rugi, neraca, dan kewajiban perpajakan.", position_x: 0.0, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "legal-counsel", name: "Agung (Legal Counsel)", division: "Finance & Legal", role: "Specialist", system_prompt: "Menyusun draf perjanjian NDA, kontrak kerja sama bisnis, dan konsultasi kepatuhan hukum.", position_x: 2.0, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "payroll-spec", name: "Dewi (Payroll Admin)", division: "Finance & Legal", role: "Specialist", system_prompt: "Mengurus perhitungan gaji harian/bulanan, klaim BPJS, serta tunjangan karyawan.", position_x: -2.0, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "procurement", name: "Irfan (Procurement Mgr)", division: "Finance & Legal", role: "Specialist", system_prompt: "Mengelola pengadaan alat kerja, evaluasi vendor, dan efisiensi pembelian operasional.", position_x: 0.0, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "auditor", name: "Citra (Internal Auditor)", division: "Finance & Legal", role: "Specialist", system_prompt: "Mengaudit kepatuhan standar keuangan dan memastikan tidak ada penyimpangan prosedur.", position_x: 2.0, position_y: 0.0, position_z: 1.0, status: "Active" },

    // HR & Operations Division
    { id: "hr-lead", name: "Siska (CHRO)", division: "HR & Operations", role: "Manager", system_prompt: "Mengelola strategi pengembangan talenta, budaya perusahaan, serta struktur organisasi.", position_x: 9.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "recruiter-1", name: "Doni (Tech Recruiter)", division: "HR & Operations", role: "Specialist", system_prompt: "Mengatur proses rekrutmen kandidat, wawancara teknis, dan pencarian talenta software/AI.", position_x: 11.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "hrbp", name: "Indah (HRBP)", division: "HR & Operations", role: "Specialist", system_prompt: "Mendampingi kebutuhan operasional HR setiap divisi serta evaluasi kinerja harian.", position_x: 13.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "office-mgr", name: "Joko (Office Manager)", division: "HR & Operations", role: "Specialist", system_prompt: "Memastikan kelancaran fasilitas fisik kantor, kenyamanan kerja, dan logistik harian.", position_x: 10.5, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "people-dev", name: "Laras (Learning & Dev)", division: "HR & Operations", role: "Specialist", system_prompt: "Merancang program pelatihan ketrampilan, workshop, dan pengembangan jenjang karir.", position_x: 12.5, position_y: 0.0, position_z: 1.0, status: "Active" },

    // Marketing Division
    { id: "mkt-lead", name: "Eko (Marketing Lead)", division: "Marketing", role: "Manager", system_prompt: "Menyusun strategi pertumbuhan brand, kampanye promosi, dan perencanaan media pemasaran.", position_x: -2.0, position_y: 0.0, position_z: 6.0, status: "Active" },
    { id: "content-writer", name: "Rina (Content Lead)", division: "Marketing", role: "Specialist", system_prompt: "Menulis artikel blog SEO, naskah iklan promosi, dan materi kampanye tulisan.", position_x: 0.0, position_y: 0.0, position_z: 6.0, status: "Active" },
    { id: "seo-spec", name: "Fajar (SEO Specialist)", division: "Marketing", role: "Specialist", system_prompt: "Menganalisis riset kata kunci, optimasi SEO teknis web, dan meningkatkan peringkat di pencarian.", position_x: 2.0, position_y: 0.0, position_z: 6.0, status: "Active" },
    { id: "social-media", name: "Anisa (Social Media Mgr)", division: "Marketing", role: "Specialist", system_prompt: "Merancang kalender konten sosial media (Instagram, TikTok, LinkedIn) dan interaksi publik.", position_x: -2.0, position_y: 0.0, position_z: 8.0, status: "Active" },
    { id: "ppc-spec", name: "Gilang (Performance Mkt)", division: "Marketing", role: "Specialist", system_prompt: "Mengoptimalkan iklan digital berbayar (Google Ads, Meta Ads) dan konversi pelanggan.", position_x: 0.0, position_y: 0.0, position_z: 8.0, status: "Active" },
    { id: "pr-spec", name: "Tania (PR Specialist)", division: "Marketing", role: "Specialist", system_prompt: "Menulis siaran pers (press release), menjalin relasi media, dan publikasi citra baik perusahaan.", position_x: 2.0, position_y: 0.0, position_z: 8.0, status: "Active" },
  ];

  const handleStatusUpdate = (id: string, text: string) => {
    setActivityLogs((prev) => [
      { id, text, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
      ...prev.slice(0, 7),
    ]);
  };

  const handleSelectAgent = async (agent: Agent) => {
    setSelectedAgent(agent);
    setActiveTab("brief");
    setMessages([]);

    try {
      const res = await fetch(`https://office-ai-backend.vercel.app/messages/${agent.id}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(
          data.messages.map((m: { sender: string; text: string }) => ({
            sender: m.sender === "user" ? "You" : agent.name,
            text: m.text,
          }))
        );
      }
    } catch {
      // History fallback
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedAgent) return;
    const userMsg = inputText;
    setMessages((prev) => [...prev, { sender: "You", text: userMsg }]);
    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("https://office-ai-backend.vercel.app/chat/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: selectedAgent.id, message: userMsg }),
      });
      const data = await res.json();
      const replyText = Array.isArray(data.response) ? data.response[0]?.text : data.response;

      if (replyText) {
        setMessages((prev) => [...prev, { sender: selectedAgent.name, text: replyText }]);
      } else {
        const naturalReply = generateNaturalHumanResponse(selectedAgent, userMsg, agents);
        setMessages((prev) => [...prev, { sender: selectedAgent.name, text: naturalReply }]);
      }
    } catch {
      setTimeout(() => {
        const naturalReply = generateNaturalHumanResponse(selectedAgent, userMsg, agents);
        setMessages((prev) => [...prev, { sender: selectedAgent.name, text: naturalReply }]);
        setLoading(false);
      }, 700);
    } finally {
      setLoading(false);
    }
  };

  const teamMembers = useMemo(() => {
    if (!selectedAgent) return [];
    return agents.filter((a) => a.division === selectedAgent.division);
  }, [selectedAgent, agents]);

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden font-sans select-none">
      {/* HUD Header */}
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur border border-slate-200 text-slate-800 p-3.5 rounded-2xl shadow-lg flex items-center gap-4">
        <div>
          <h1 className="font-bold text-sm tracking-wide flex items-center gap-2 text-indigo-900">
            <span>🏢</span> 3D AI Office HQ — Single Floor (36 AI Agents)
          </h1>
          <p className="text-xs text-slate-500">36 AI Agents spread across 7 Division Suites in Ground Floor</p>
        </div>
      </div>

      {/* Log Aktivitas Otonom */}
      <div className="absolute bottom-4 left-4 z-10 w-80 max-h-48 bg-white/85 backdrop-blur border border-slate-200 text-slate-800 p-3 rounded-2xl shadow-lg overflow-hidden pointer-events-none">
        <h3 className="text-[11px] font-bold text-indigo-600 mb-2 flex items-center gap-1">
          <span>📡</span> LIVE AGENT ACTIVITIES
        </h3>
        <div className="space-y-1.5 overflow-y-auto max-h-36 pr-1">
          {activityLogs.map((log, idx) => (
            <div key={idx} className="text-[10px] text-slate-600 flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="truncate pr-2">• {log.text}</span>
              <span className="text-[9px] text-slate-400">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 22, 20], fov: 45 }}>
        <ambientLight intensity={1.1} />
        <directionalLight castShadow position={[18, 28, 16]} intensity={1.8} color="#fffbeb" />
        <hemisphereLight args={["#ffffff", "#cbd5e1", 0.7]} />
        <ContactShadows opacity={0.45} scale={40} blur={1.5} far={10} color="#000000" />

        <BuildingStructure />
        <AllDivisionRooms />

        {/* Meja Kerja Statis */}
        {agents.map((agent) => (
          <group key={`desk-${agent.id}`} position={[agent.position_x, 0, agent.position_z]}>
            <StaticWorkstationDesk color={DIVISION_COLORS[agent.division] || "#64748b"} isWorking={loading && selectedAgent?.id === agent.id} />
          </group>
        ))}

        {/* 36 Agen Otonom */}
        {agents.map((agent) => (
          <AutonomousAgent3D
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            isBackendWorking={loading && selectedAgent?.id === agent.id}
            onSelect={handleSelectAgent}
            onStatusUpdate={handleStatusUpdate}
          />
        ))}

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} minDistance={5} maxDistance={40} />
      </Canvas>

      {/* Sidebar Navigation (Chat & Brief Tim) */}
      {selectedAgent && (
        <div className="absolute top-0 right-0 w-96 h-full bg-white/95 border-l border-slate-200 backdrop-blur text-slate-800 flex flex-col z-20 shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-bold text-base flex items-center gap-2 text-indigo-900">
                <span>👤</span> {selectedAgent.name}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedAgent.division} • {selectedAgent.role}
              </p>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="text-slate-400 hover:text-slate-700 bg-slate-200/60 p-1.5 rounded-lg text-xs">
              ✕
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-100/60">
            <button
              onClick={() => setActiveTab("brief")}
              className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === "brief" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📋</span> Brief Tim
            </button>
            <button
              onClick={() => setActiveTab("pribadi")}
              className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === "pribadi" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>💬</span> Percakapan Pribadi
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "brief" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Persona & Mission */}
              <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl space-y-1">
                <h3 className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <span>🎯</span> Deskripsi Peran & Keahlian
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedAgent.system_prompt || "Agen ini mengelola tugas operasional harian sesuai dengan pembagian peran divisi."}
                </p>
              </div>

              {/* Anggota Tim Divisi */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>👥</span> Anggota Tim Divisi ({selectedAgent.division})
                </h3>
                <div className="space-y-1.5">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => handleSelectAgent(member)}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                        member.id === selectedAgent.id ? "bg-indigo-50 border-indigo-300 font-semibold text-indigo-900" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIVISION_COLORS[member.division] }}></span>
                        <span>{member.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{member.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1 mb-3">
                {messages.length === 0 && (
                  <div className="text-slate-400 text-center mt-12 space-y-1">
                    <p className="font-medium">Belum ada obrolan pribadi</p>
                    <p className="text-[11px] text-slate-400">Ketik pesan di bawah untuk mulai berdiskusi secara langsung dengan {selectedAgent.name}.</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl max-w-[85%] ${
                      msg.sender === "You" ? "bg-indigo-600 text-white ml-auto" : "bg-slate-100 text-slate-800 border border-slate-200"
                    }`}
                  >
                    <p className="text-[9px] opacity-70 mb-0.5">{msg.sender}</p>
                    <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                  </div>
                ))}
                {loading && <div className="text-amber-600 text-xs animate-pulse">⚡ {selectedAgent.name} sedang membalas...</div>}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={`Pesan pribadi ke ${selectedAgent.name}...`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                />
                <button onClick={handleSendMessage} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-medium shadow">
                  Kirim
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}