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

const DIVISION_COLORS: Record<string, string> = {
  Executive: "#e11d48",
  Technology: "#2563eb",
  "Product & Design": "#9333ea",
  Marketing: "#16a34a",
  "Sales & BD": "#ea580c",
  "Finance & Legal": "#ca8a04",
  "HR & Operations": "#0d9488",
};

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

function generateNaturalHumanResponse(agent: Agent, userMsg: string, allAgents: Agent[]): string {
  const lowerMsg = userMsg.toLowerCase();

  const isBriefingQuery =
    lowerMsg.includes("briefing") ||
    lowerMsg.includes("semua divisi") ||
    lowerMsg.includes("lintas divisi") ||
    lowerMsg.includes("kumpulkan") ||
    lowerMsg.includes("rapat") ||
    lowerMsg.includes("koordinasi") ||
    lowerMsg.includes("instruksikan") ||
    lowerMsg.includes("arahkan") ||
    lowerMsg.includes("minta") ||
    lowerMsg.includes("tugaskan") ||
    lowerMsg.includes("perbarui") ||
    lowerMsg.includes("konsep") ||
    lowerMsg.includes("estimasi") ||
    lowerMsg.includes("proyek") ||
    lowerMsg.includes("projek") ||
    lowerMsg.includes("modern");

  if (isBriefingQuery) {
    if (agent.role === "CEO" || agent.division === "Executive") {
      const techMgr = allAgents.find((a) => a.division === "Technology" && a.role === "Manager")?.name || "Alex (Tech Lead)";
      const prodMgr = allAgents.find((a) => a.division === "Product & Design" && a.role === "Manager")?.name || "Diana (Head of Product)";
      
      return `Siap, instruksi diterima! Saya selaku CEO (Pak Pakar) langsung menginstruksikan tim terkait untuk mengeksekusi pembaruan ini.\n\n` +
        `📌 AGENDA UTAMA:\n"${userMsg}"\n\n` +
        `📋 PEMBAGIAN TUGAS SPESIFIK:\n` +
        `1. 🎨 Divisi Product & Design (${prodMgr}):\n` +
        `   • Mengarahkan Kevin (UI/UX Lead) & Raka (3D Artist) untuk merancang konsep visual & moodboard tampilan modern.\n\n` +
        `2. 💻 Divisi Technology (${techMgr}):\n` +
        `   • Mengarahkan Siti (Frontend Dev) untuk menganalisis estimasi waktu pengerjaan, kelayakan komponen React/WebGL, serta kebutuhan slicing UI.\n\n` +
        `Seluruh tim sudah menerima instruksi dan langsung berkoordinasi. Laporan konsep awal dan estimasi timeline akan segera disajikan kepada Anda.`;
    } else {
      return `Instruksi Anda mengenai "${userMsg}" telah saya teruskan langsung kepada Pak Pakar (CEO). Beliau sedang mengordinasikan tugas ini bersama Manajer Divisi terkait.`;
    }
  }

  const isAskingForBoss =
    lowerMsg.includes("siapa pimpinan") ||
    lowerMsg.includes("siapa bos") ||
    lowerMsg.includes("siapa atasan") ||
    lowerMsg.includes("siapa manager") ||
    lowerMsg.includes("siapa manajer") ||
    lowerMsg.includes("siapa ceo") ||
    lowerMsg.includes("siapa lead") ||
    lowerMsg.includes("siapa head");

  if (isAskingForBoss) {
    const divisionManager = allAgents.find(
      (a) => a.division === agent.division && (a.role === "Manager" || a.role === "CEO")
    );
    const ceo = allAgents.find((a) => a.role === "CEO" || a.division === "Executive");

    if (agent.role === "CEO") {
      return `Saya sendiri Pak Pakar yang memimpin perusahaan ini sebagai CEO. Setiap divisi dipimpin oleh manajer masing-masing untuk operasional harian.`;
    }
    return `Atasan langsung saya di divisi ${agent.division} adalah ${divisionManager ? divisionManager.name : "Manager tim"}, dan pimpinan tertinggi perusahaan adalah ${ceo ? ceo.name : "Pak Pakar (CEO)"}.`;
  }

  const formalKeywords = [
    "laporan", "strategi", "analisis", "dokumen", "evaluasi", "proyeksi",
    "rekomendasi", "prosedur", "anggaran", "sop", "kontrak", "arsitektur",
    "audit", "rencana kerja", "roadmap", "kepatuhan", "kpi", "risiko"
  ];
  if (formalKeywords.some((key) => lowerMsg.includes(key))) {
    return `Yth. Bapak/Ibu,\n\nMenindaklanjuti permohonan Anda mengenai "${userMsg}", hal ini telah dicatat dalam agenda prioritas Divisi ${agent.division}.\n\nHormat kami,\n${agent.name}\n${agent.role} - Divisi ${agent.division}`;
  }

  if (lowerMsg.includes("teman") || lowerMsg.includes("tim") || lowerMsg.includes("anggota")) {
    const team = allAgents.filter((a) => a.division === agent.division && a.id !== agent.id);
    return `Di divisi ${agent.division}, saya bekerjasama dengan ${team.map((a) => a.name).join(", ")}.`;
  }

  if (lowerMsg.includes("halo") || lowerMsg.includes("hai") || lowerMsg.includes("pagi") || lowerMsg.includes("siang")) {
    return `Halo! Saya ${agent.name}. Ada yang bisa saya bantu terkait divisi ${agent.division} hari ini?`;
  }

  return `Mengenai "${userMsg}", poin tersebut telah saya pahami dan akan ditindaklanjuti oleh tim ${agent.division}.`;
}

const WORKSPACES: Record<string, Waypoint> = {
  CANTEEN_TABLE_1_A: { x: -7.5, y: 0, z: 7.5, name: "Kantin Meja 1 (A) 🍽️" },
  CANTEEN_TABLE_1_B: { x: -6.0, y: 0, z: 7.5, name: "Kantin Meja 1 (B) 🍽️" },
  COFFEE_COUNTER: { x: -11.0, y: 0, z: 8.5, name: "Barista Coffee Counter ☕" },
  LOUNGE_AREA: { x: 8.5, y: 0, z: 8.5, name: "Lounge Santai 🛋️" },
};

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
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={color} transparent opacity={0.2} roughness={0.8} />
      </mesh>

      <mesh position={[0, h / 2, -d / 2]}>
        <boxGeometry args={[w, h, wallThickness]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} roughness={0.05} metalness={0.8} />
      </mesh>
      <mesh position={[0, h, -d / 2]}>
        <boxGeometry args={[w + 0.08, 0.08, 0.08]} />
        <meshStandardMaterial color={color} metalness={0.8} />
      </mesh>

      <mesh position={[-w / 2, h / 2, 0]}>
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} roughness={0.05} metalness={0.8} />
      </mesh>
      <mesh position={[-w / 2, h, 0]}>
        <boxGeometry args={[0.08, 0.08, d + 0.08]} />
        <meshStandardMaterial color={color} metalness={0.8} />
      </mesh>

      <mesh position={[w / 2, h / 2, 0]}>
        <boxGeometry args={[wallThickness, h, d]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.15} roughness={0.05} metalness={0.8} />
      </mesh>
      <mesh position={[w / 2, h, 0]}>
        <boxGeometry args={[0.08, 0.08, d + 0.08]} />
        <meshStandardMaterial color={color} metalness={0.8} />
      </mesh>

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

      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={isFemale ? [0.14, 0.16, 0.4, 16] : [0.2, 0.16, 0.42, 16]} />
        <meshStandardMaterial color={isCEO ? "#1e293b" : traits.topColor} roughness={0.3} />
      </mesh>

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

function AutonomousAgent3D({
  agent,
  isSelected,
  isBackendWorking,
  isTargetInvolved,
  hasUnread,
  onSelect,
  onStatusUpdate,
}: {
  agent: Agent;
  isSelected: boolean;
  isBackendWorking: boolean;
  isTargetInvolved: boolean;
  hasUnread: boolean;
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
    if (isBackendWorking || isTargetInvolved) {
      setWaypointQueue([
        { x: 0, y: 0, z: -5.0, name: "Ruang CEO (Rapat Lintas Divisi) 🏃‍♂️️" },
        { x: homeX, y: 0, z: chairZ, name: "Kembali Eksekusi Tugas 💼" }
      ]);
      setEmote("🏃‍♂️ BERKOORDINASI...");
      onStatusUpdate(agent.id, `${agent.name} sedang berjalan menuju Executive Suite untuk berkoordinasi...`);
    }
  }, [isBackendWorking, isTargetInvolved, homeX, chairZ, agent.id, agent.name]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isBackendWorking || isTargetInvolved) return;

      if (Math.random() < 0.35) {
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
        }, 9000);
      }
    }, 12000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, [isBackendWorking, isTargetInvolved, homeX, chairZ, agent.id, agent.name]);

  useFrame((_, delta) => {
    if (waypointQueue.length === 0) return;

    const target = waypointQueue[0];
    const dx = target.x - currentPos.x;
    const dz = target.z - currentPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.15) {
      const speed = 3.0 * delta;
      const nx = currentPos.x + (dx / dist) * Math.min(speed, dist);
      const nz = currentPos.z + (dz / dist) * Math.min(speed, dist);

      setCurrentPos({ x: nx, y: 0, z: nz });
      setRotationY(Math.atan2(dx, dz));
      setAnimState("WALKING");
    } else {
      setWaypointQueue((prev) => prev.slice(1));
      if (waypointQueue.length === 1) {
        setAnimState("SITTING");
        setEmote("💬 BERDISKUSI...");
      } else if (waypointQueue.length === 0) {
        setAnimState("TYPING");
        setEmote(undefined);
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
            isBackendWorking || isTargetInvolved
              ? "bg-amber-100 border-amber-500 animate-pulse font-bold scale-110"
              : isSelected
              ? "bg-indigo-600 text-white border-white scale-110 font-bold"
              : "bg-white/90 border-slate-300 hover:scale-105 font-medium"
          }`}
        >
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }}></span>
          <span>{agent.name}</span>
          {hasUnread && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold animate-bounce ml-0.5">
              📩 New
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

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

export default function OfficeCanvas() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<"brief" | "pribadi">("pribadi");
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, { sender: string; text: string }[]>>({});
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [involvedAgentIds, setInvolvedAgentIds] = useState<string[]>([]);
  const [unreadAgentIds, setUnreadAgentIds] = useState<string[]>([]);
  const [activityLogs, setActivityLogs] = useState<{ id: string; text: string; time: string }[]>([]);

  // State Modal CEO Briefing Form Eksplisit
  const [isCeoModalOpen, setIsCeoModalOpen] = useState(false);
  const [ceoBriefInput, setCeoBriefInput] = useState("");

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
    { id: "ceo-main", name: "Pak Pakar (CEO)", division: "Executive", role: "CEO", system_prompt: "Menganalisis strategi perusahaan skala besar, menentukan eksekusi antar divisi, dan menyusun laporan konsolidasi eksekutif.", position_x: 0.0, position_y: 0.0, position_z: -7.0, status: "Active" },
    { id: "tech-lead", name: "Alex (Tech Lead)", division: "Technology", role: "Manager", system_prompt: "Menganalisis arsitektur sistem, memecah brief teknis produk, dan mengkoordinasikan tim developer.", position_x: -13.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "fe-dev-1", name: "Siti (Frontend Dev)", division: "Technology", role: "Specialist", system_prompt: "Mengembangkan tampilan web interaktif, slicing UI/UX menggunakan React, Next.js, dan TailwindCSS.", position_x: -11.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "fe-dev-2", name: "Rian (Mobile Dev)", division: "Technology", role: "Specialist", system_prompt: "Mengembangkan aplikasi mobile cross-platform menggunakan Flutter dan React Native.", position_x: -9.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "be-dev-1", name: "Budi (Backend Dev)", division: "Technology", role: "Specialist", system_prompt: "Merancang API RESTful, arsitektur database, dan microservices menggunakan Python FastAPI.", position_x: -13.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "be-dev-2", name: "Dedi (DevOps Eng)", division: "Technology", role: "Specialist", system_prompt: "Mengelola server deployment, container Docker, Kubernetes, dan pipeline CI/CD otomatis.", position_x: -11.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "qa-eng", name: "Maya (QA Lead)", division: "Technology", role: "Specialist", system_prompt: "Melakukan pengujian fitur otomatis (automated testing), pengujian performa, dan memastikan kualitas software.", position_x: -9.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "product-head", name: "Diana (Head of Product)", division: "Product & Design", role: "Manager", system_prompt: "Merancang dokumen PRD, prioritas fitur backlog, serta menyusun roadmap pengembangan produk.", position_x: 9.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "uiux-1", name: "Kevin (UI/UX Lead)", division: "Product & Design", role: "Specialist", system_prompt: "Membuat rancangan wireframe, prototype interaktif Figma, dan konsistensi Design System.", position_x: 11.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "uiux-2", name: "Nadia (UX Researcher)", division: "Product & Design", role: "Specialist", system_prompt: "Mengadakan user interview, usability testing, serta memetakan kebutuhan pengguna.", position_x: 13.5, position_y: 0.0, position_z: -8.0, status: "Active" },
    { id: "design-3d", name: "Raka (3D Artist)", division: "Product & Design", role: "Specialist", system_prompt: "Membuat model 3D, animasi interaktif, dan visualisasi WebGL.", position_x: 9.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "graphic-des", name: "Sari (Graphic Designer)", division: "Product & Design", role: "Specialist", system_prompt: "Merancang aset grafik untuk materi promosi, banner, dan identitas visual perusahaan.", position_x: 11.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "scrum-master", name: "Bagas (Scrum Master)", division: "Product & Design", role: "Specialist", system_prompt: "Mengawal kelancaran siklus Sprint, daily standup, serta membantu tim mengatasi hambatan.", position_x: 13.5, position_y: 0.0, position_z: -6.0, status: "Active" },
    { id: "sales-lead", name: "Hendra (VP of Sales)", division: "Sales & BD", role: "Manager", system_prompt: "Memimpin strategi B2B sales, negosiasi tingkat tinggi, dan pencapaian target revenue perusahaan.", position_x: -13.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "account-exec", name: "Lia (Account Executive)", division: "Sales & BD", role: "Specialist", system_prompt: "Melakukan demonstrasi produk ke calon klien, negosiasi penawaran, dan penutupan kontrak.", position_x: -11.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "bizdev-1", name: "Reza (BizDev Manager)", division: "Sales & BD", role: "Specialist", system_prompt: "Mengeksplorasi kemitraan strategis baru, riset ekspansi bisnis, dan aliansi industri.", position_x: -9.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "cust-success", name: "Putri (Customer Success)", division: "Sales & BD", role: "Specialist", system_prompt: "Mengelola hubungan baik dengan klien pasca-penjualan, kepuasan pengguna, dan retensi akun.", position_x: -13.5, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "sales-dev", name: "Taufik (SDR Lead)", division: "Sales & BD", role: "Specialist", system_prompt: "Melakukan prospeksi awal leads, riset kontak potensial, dan kualifikasi calon pembeli.", position_x: -11.5, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "crm-spec", name: "Vina (CRM Specialist)", division: "Sales & BD", role: "Specialist", system_prompt: "Mengelola database CRM, otomatisasi pipeline sales, dan follow-up email calon klien.", position_x: -9.5, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "fin-lead", name: "Bambang (CFO)", division: "Finance & Legal", role: "Manager", system_prompt: "Mengendalikan strategi keuangan, perencanaan anggaran, arus kas, dan proyeksi finansial.", position_x: -2.0, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "accountant", name: "Yuni (Senior Accountant)", division: "Finance & Legal", role: "Specialist", system_prompt: "Menyusun pembukuan jurnal harian, laporan laba rugi, neraca, dan kewajiban perpajakan.", position_x: 0.0, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "legal-counsel", name: "Agung (Legal Counsel)", division: "Finance & Legal", role: "Specialist", system_prompt: "Menyusun draf perjanjian NDA, kontrak kerja sama bisnis, dan konsultasi kepatuhan hukum.", position_x: 2.0, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "payroll-spec", name: "Dewi (Payroll Admin)", division: "Finance & Legal", role: "Specialist", system_prompt: "Mengurus perhitungan gaji harian/bulanan, klaim BPJS, serta tunjangan karyawan.", position_x: -2.0, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "procurement", name: "Irfan (Procurement Mgr)", division: "Finance & Legal", role: "Specialist", system_prompt: "Mengelola pengadaan alat kerja, evaluasi vendor, dan efisiensi pembelian operasional.", position_x: 0.0, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "auditor", name: "Citra (Internal Auditor)", division: "Finance & Legal", role: "Specialist", system_prompt: "Mengaudit kepatuhan standar keuangan dan memastikan tidak ada penyimpangan prosedur.", position_x: 2.0, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "hr-lead", name: "Siska (CHRO)", division: "HR & Operations", role: "Manager", system_prompt: "Mengelola strategi pengembangan talenta, budaya perusahaan, serta struktur organisasi.", position_x: 9.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "recruiter-1", name: "Doni (Tech Recruiter)", division: "HR & Operations", role: "Specialist", system_prompt: "Mengatur proses rekrutmen kandidat, wawancara teknis, dan pencarian talenta software/AI.", position_x: 11.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "hrbp", name: "Indah (HRBP)", division: "HR & Operations", role: "Specialist", system_prompt: "Mendampingi kebutuhan operasional HR setiap divisi serta evaluasi kinerja harian.", position_x: 13.5, position_y: 0.0, position_z: -1.0, status: "Active" },
    { id: "office-mgr", name: "Joko (Office Manager)", division: "HR & Operations", role: "Specialist", system_prompt: "Memastikan kelancaran fasilitas fisik kantor, kenyamanan kerja, dan logistik harian.", position_x: 10.5, position_y: 0.0, position_z: 1.0, status: "Active" },
    { id: "people-dev", name: "Laras (Learning & Dev)", division: "HR & Operations", role: "Specialist", system_prompt: "Merancang program pelatihan ketrampilan, workshop, dan pengembangan jenjang karir.", position_x: 12.5, position_y: 0.0, position_z: 1.0, status: "Active" },
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
    setActiveTab("pribadi");

    // Bersihkan unread badge untuk agen ini
    setUnreadAgentIds((prev) => prev.filter((id) => id !== agent.id));

    if (messagesByAgent[agent.id]) {
      setMessages(messagesByAgent[agent.id]);
    } else {
      setMessages([]);
    }

    try {
      const res = await fetch(`https://office-ai-backend.vercel.app/messages/${agent.id}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        const fetchedMsgs = data.messages.map((m: { sender: string; text: string }) => ({
          sender: m.sender === "user" || m.sender === "You" ? "You" : m.sender,
          text: m.text,
        }));
        setMessages(fetchedMsgs);
        setMessagesByAgent((prev) => ({
          ...prev,
          [agent.id]: fetchedMsgs,
        }));
      }
    } catch {
      // Fallback
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedAgent) return;
    const userMsg = inputText;
    const currentAgentId = selectedAgent.id;
    const userMsgObj = { sender: "You", text: userMsg };

    setMessages((prev) => [...prev, userMsgObj]);
    setMessagesByAgent((prev) => ({
      ...prev,
      [currentAgentId]: [...(prev[currentAgentId] || []), userMsgObj],
    }));

    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("https://office-ai-backend.vercel.app/chat/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: currentAgentId, message: userMsg }),
      });
      const data = await res.json();
      const replyText = Array.isArray(data.response) ? data.response[0]?.text : data.response;

      if (data.involved_ids && Array.isArray(data.involved_ids)) {
        setInvolvedAgentIds(data.involved_ids);
        setUnreadAgentIds((prev) => Array.from(new Set([...prev, ...data.involved_ids])));
        setTimeout(() => setInvolvedAgentIds([]), 14000);
      }

      const replySender = replyText ? (data.agent_name || selectedAgent.name) : selectedAgent.name;
      const finalReplyText = replyText || generateNaturalHumanResponse(selectedAgent, userMsg, agents);
      const replyMsgObj = { sender: replySender, text: finalReplyText };

      setMessages((prev) => [...prev, replyMsgObj]);
      setMessagesByAgent((prev) => ({
        ...prev,
        [currentAgentId]: [...(prev[currentAgentId] || []), replyMsgObj],
      }));
    } catch {
      setTimeout(() => {
        const naturalReply = generateNaturalHumanResponse(selectedAgent, userMsg, agents);
        const fallbackObj = { sender: selectedAgent.name, text: naturalReply };

        setMessages((prev) => [...prev, fallbackObj]);
        setMessagesByAgent((prev) => ({
          ...prev,
          [currentAgentId]: [...(prev[currentAgentId] || []), fallbackObj],
        }));

        setInvolvedAgentIds(["ceo-main", "uiux-1", "design-3d", "fe-dev-1"]);
        setUnreadAgentIds((prev) => Array.from(new Set([...prev, "uiux-1", "design-3d", "fe-dev-1"])));
        setTimeout(() => setInvolvedAgentIds([]), 14000);
        setLoading(false);
      }, 700);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCeoBriefModal = async () => {
    if (!ceoBriefInput.trim()) return;
    const briefText = ceoBriefInput;
    setCeoBriefInput("");
    setIsCeoModalOpen(false);
    setLoading(true);

    // Cari agen CEO
    const ceoAgent = agents.find((a) => a.id === "ceo-main") || agents[0];
    setSelectedAgent(ceoAgent);

    try {
      const res = await fetch("https://office-ai-backend.vercel.app/chat/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: "ceo-main", message: briefText }),
      });
      const data = await res.json();
      
      if (data.involved_ids && Array.isArray(data.involved_ids)) {
        setInvolvedAgentIds(data.involved_ids);
        setUnreadAgentIds((prev) => Array.from(new Set([...prev, ...data.involved_ids])));
        setTimeout(() => setInvolvedAgentIds([]), 14000);
      }

      handleSelectAgent(ceoAgent);
    } catch {
      setInvolvedAgentIds(["ceo-main", "uiux-1", "design-3d", "fe-dev-1"]);
      setUnreadAgentIds(["uiux-1", "design-3d", "fe-dev-1"]);
      setTimeout(() => setInvolvedAgentIds([]), 14000);
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
      {/* HEADER & BUTTON BRIEFING CEO */}
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur border border-slate-200 text-slate-800 p-3.5 rounded-2xl shadow-lg flex items-center gap-4">
        <div>
          <h1 className="font-bold text-sm tracking-wide flex items-center gap-2 text-indigo-900">
            <span>🏢</span> 3D AI Office HQ — Single Floor (36 AI Agents)
          </h1>
          <p className="text-xs text-slate-500">36 AI Agents spread across 7 Division Suites in Ground Floor</p>
        </div>
        <button
          onClick={() => setIsCeoModalOpen(true)}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition flex items-center gap-1.5"
        >
          <span>📢</span> Kirim Briefing CEO
        </button>
      </div>

      {/* MODAL FORM BRIEFING CEO EKSPLISIT */}
      {isCeoModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-base text-rose-900 flex items-center gap-2">
                <span>📢</span> Instruksi Briefing Strategis CEO (Pak Pakar)
              </h3>
              <button onClick={() => setIsCeoModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kirimkan instruksi/arahan makro perusahaan kepada Pak Pakar (CEO). Beliau akan membedah instruksi ini dan mengoordinasikannya secara otomatis ke manajer & spesialis divisi terkait.
            </p>
            <textarea
              rows={4}
              value={ceoBriefInput}
              onChange={(e) => setCeoBriefInput(e.target.value)}
              placeholder="Contoh: Pak Pakar, perusahaan mau meluncurkan pembaruan aplikasi mobile. Tolong kumpulkan divisi Product dan Technology untuk buat rencana kerja..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500 text-slate-800"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCeoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSendCeoBriefModal}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow"
              >
                Eksekusi Briefing 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE ACTIVITY LOGS */}
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

      <Canvas shadows camera={{ position: [0, 22, 20], fov: 45 }}>
        <ambientLight intensity={1.1} />
        <directionalLight castShadow position={[18, 28, 16]} intensity={1.8} color="#fffbeb" />
        <hemisphereLight args={["#ffffff", "#cbd5e1", 0.7]} />
        <ContactShadows opacity={0.45} scale={40} blur={1.5} far={10} color="#000000" />

        <BuildingStructure />
        <AllDivisionRooms />

        {agents.map((agent) => (
          <group key={`desk-${agent.id}`} position={[agent.position_x, 0, agent.position_z]}>
            <StaticWorkstationDesk color={DIVISION_COLORS[agent.division] || "#64748b"} isWorking={loading && selectedAgent?.id === agent.id} />
          </group>
        ))}

        {agents.map((agent) => (
          <AutonomousAgent3D
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            isBackendWorking={loading && selectedAgent?.id === agent.id}
            isTargetInvolved={involvedAgentIds.includes(agent.id)}
            hasUnread={unreadAgentIds.includes(agent.id)}
            onSelect={handleSelectAgent}
            onStatusUpdate={handleStatusUpdate}
          />
        ))}

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} minDistance={5} maxDistance={40} />
      </Canvas>

      {/* SIDEBAR PANEL CHAT */}
      {selectedAgent && (
        <div className="absolute top-0 right-0 w-96 h-full bg-white/95 border-l border-slate-200 backdrop-blur text-slate-800 flex flex-col z-20 shadow-2xl">
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
              <span>💬</span> Percakapan
            </button>
          </div>

          {activeTab === "brief" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl space-y-1">
                <h3 className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <span>🎯</span> Deskripsi Peran & Keahlian
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedAgent.system_prompt || "Agen ini mengelola tugas operasional harian sesuai dengan pembagian peran divisi."}
                </p>
              </div>

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
              <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1 mb-3">
                {messages.length === 0 && (
                  <div className="text-slate-400 text-center mt-12 space-y-1">
                    <p className="font-medium">Belum ada obrolan</p>
                    <p className="text-[11px] text-slate-400">Ketik pesan di bawah untuk berdiskusi dengan {selectedAgent.name}.</p>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isUser = msg.sender === "You";
                  const isCEO = msg.sender.includes("Pak Pakar") || msg.sender.includes("CEO");

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl max-w-[88%] ${
                        isUser
                          ? "bg-indigo-600 text-white ml-auto"
                          : isCEO
                          ? "bg-rose-50 text-rose-950 border border-rose-200 mr-auto"
                          : "bg-slate-100 text-slate-800 border border-slate-200 mr-auto"
                      }`}
                    >
                      <p className={`text-[9px] font-bold mb-1 flex items-center gap-1 ${
                        isUser ? "text-indigo-200" : isCEO ? "text-rose-700" : "text-slate-500"
                      }`}>
                        <span>{isUser ? "👤 You" : isCEO ? "👑 " + msg.sender : "💬 " + msg.sender}</span>
                      </p>
                      <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                    </div>
                  );
                })}
                {loading && <div className="text-amber-600 text-xs animate-pulse">⚡ {selectedAgent.name} sedang merespons...</div>}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={`Pesan ke ${selectedAgent.name}...`}
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