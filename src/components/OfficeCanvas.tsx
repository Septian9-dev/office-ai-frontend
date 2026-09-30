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

// Navigasi Waypoints Kantor
const WORKSPACES: Record<string, Waypoint> = {
  CANTEEN_TABLE_1_A: { x: -6.2, y: 0, z: 5.2, name: "Kantin Meja 1 (A) 🍽️" },
  CANTEEN_TABLE_1_B: { x: -4.8, y: 0, z: 5.2, name: "Kantin Meja 1 (B) 🍽️" },
  CANTEEN_TABLE_2_A: { x: -6.2, y: 0, z: 7.2, name: "Kantin Meja 2 (A) ☕" },
  CANTEEN_TABLE_2_B: { x: -4.8, y: 0, z: 7.2, name: "Kantin Meja 2 (B) ☕" },
  COFFEE_COUNTER: { x: -8.5, y: 0, z: 6.2, name: "Barista Coffee Counter ☕" },

  LOUNGE_L2: { x: -5, y: 4.5, z: 2.0, name: "Lounge Mezzanine L2 🛋️" },
  BALCONY_L2: { x: 5, y: 4.5, z: 2.0, name: "Balkon Santai L2 🌿" },

  // Navigasi Tangga Wajib L-Shape
  STAIRS_BOTTOM: { x: -11, y: 0, z: 1.0, name: "Pijakan Bawah Tangga 🪜" },
  STAIRS_LANDING: { x: -11, y: 2.25, z: -3.8, name: "Bordes Tengah Tangga 🪜" },
  STAIRS_TOP: { x: -7.5, y: 4.5, z: -3.8, name: "Pijakan Atas Tangga 🪜" },

  // Navigasi Pintu Lift Wajib
  ELEVATOR_DOOR_L1: { x: 11, y: 0, z: 2.5, name: "Depan Pintu Lift Lantai 1 🛗" },
  ELEVATOR_CABIN_L1: { x: 11, y: 0, z: 1.0, name: "Dalam Kabin Lift Lantai 1 🛗" },
  ELEVATOR_DOOR_L2: { x: 11, y: 4.5, z: 2.5, name: "Depan Pintu Lift Lantai 2 🛗" },
  ELEVATOR_CABIN_L2: { x: 11, y: 4.5, z: 1.0, name: "Dalam Kabin Lift Lantai 2 🛗" },
};

// CONTROLLER LIFT OTOMATIS BERKAPASITAS 4 ORANG
const ELEVATOR_MAX_CAPACITY = 4;
class ElevatorController {
  currentY = 0;
  targetY = 0;
  passengers: string[] = [];
  queueL1: string[] = [];
  queueL2: string[] = [];
  doorOpenProgress = 0;

  update(delta: number) {
    const distance = Math.abs(this.currentY - this.targetY);

    if (distance > 0.05) {
      this.doorOpenProgress = Math.max(0, this.doorOpenProgress - delta * 4);
      if (this.doorOpenProgress < 0.1) {
        const step = Math.sign(this.targetY - this.currentY) * 2.2 * delta;
        this.currentY += step;
      }
    } else {
      this.currentY = this.targetY;
      this.doorOpenProgress = Math.min(1, this.doorOpenProgress + delta * 3);

      if (this.passengers.length === 0) {
        if (this.queueL1.length > 0 && Math.abs(this.currentY - 0) > 0.1) {
          this.targetY = 0;
        } else if (this.queueL2.length > 0 && Math.abs(this.currentY - 4.5) > 0.1) {
          this.targetY = 4.5;
        }
      }
    }
  }

  requestRide(agentId: string, fromFloor: number): boolean {
    if (fromFloor === 0) {
      if (!this.queueL1.includes(agentId) && !this.passengers.includes(agentId)) {
        this.queueL1.push(agentId);
      }
      return this.canBoard(agentId, 0);
    } else {
      if (!this.queueL2.includes(agentId) && !this.passengers.includes(agentId)) {
        this.queueL2.push(agentId);
      }
      return this.canBoard(agentId, 4.5);
    }
  }

  canBoard(agentId: string, floorY: number): boolean {
    const queue = floorY === 0 ? this.queueL1 : this.queueL2;
    const positionInQueue = queue.indexOf(agentId);

    if (
      Math.abs(this.currentY - floorY) < 0.1 &&
      this.doorOpenProgress > 0.6 &&
      this.passengers.length < ELEVATOR_MAX_CAPACITY &&
      positionInQueue !== -1 &&
      positionInQueue < ELEVATOR_MAX_CAPACITY
    ) {
      return true;
    }
    return false;
  }

  board(agentId: string, floorY: number) {
    const queue = floorY === 0 ? this.queueL1 : this.queueL2;
    const idx = queue.indexOf(agentId);
    if (idx !== -1) queue.splice(idx, 1);

    if (!this.passengers.includes(agentId)) {
      this.passengers.push(agentId);
    }
    this.targetY = floorY === 0 ? 4.5 : 0;
  }

  exit(agentId: string) {
    const idx = this.passengers.indexOf(agentId);
    if (idx !== -1) this.passengers.splice(idx, 1);
  }

  getQueueIndex(agentId: string, floorY: number): number {
    const queue = floorY === 0 ? this.queueL1 : this.queueL2;
    return queue.indexOf(agentId);
  }
}
const globalElevator = new ElevatorController();

// ==========================================
// 1. KOMPONEN RUANGAN DIVISI KHUSUS
// ==========================================
function EnclosedDivisionRoom({
  title,
  icon,
  color,
  position,
  size,
  doorSide = "front",
  children,
}: {
  title: string;
  icon: string;
  color: string;
  position: [number, number, number];
  size: [number, number];
  doorSide?: "front" | "back" | "left" | "right";
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
        <meshStandardMaterial color={color} transparent opacity={0.22} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[w / 2 - 0.1, w / 2, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
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
      {doorSide === "front" && (
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
      )}

      {children}
    </group>
  );
}

// ==========================================
// 2. SELURUH 7 RUANGAN DIVISI DI 2 LANTAI
// ==========================================
function AllDivisionRooms() {
  return (
    <group>
      {/* 👑 1. Executive Suite (CEO) */}
      <EnclosedDivisionRoom
        title="EXECUTIVE CEO SUITE"
        icon="👑"
        color="#e11d48"
        position={[0, 0, -3.0]}
        size={[7.0, 5.0]}
      >
        <group position={[-1.8, 0, 0.8]}>
          <mesh castShadow position={[0, 0.2, 0]}>
            <boxGeometry args={[1.4, 0.25, 0.6]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.3} />
          </mesh>
          <mesh castShadow position={[0, 0.42, -0.25]}>
            <boxGeometry args={[1.4, 0.4, 0.1]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.18, 0.6]}>
            <boxGeometry args={[0.9, 0.04, 0.4]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.4} />
          </mesh>
        </group>
        <pointLight position={[0, 2.1, 0]} color="#fef08a" intensity={2.0} distance={5} />
      </EnclosedDivisionRoom>

      {/* 💻 2. Technology Division Room */}
      <EnclosedDivisionRoom
        title="TECHNOLOGY DIVISION"
        icon="💻"
        color="#2563eb"
        position={[-8.5, 0, -3.0]}
        size={[8.0, 5.0]}
      >
        <group position={[-3.2, 0, -1.8]}>
          <mesh castShadow position={[0, 0.9, 0]}>
            <boxGeometry args={[0.6, 1.8, 0.6]} />
            <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.9, 0.31]}>
            <planeGeometry args={[0.5, 1.6]} />
            <meshStandardMaterial color="#0284c7" emissive="#38bdf8" emissiveIntensity={0.6} />
          </mesh>
        </group>
      </EnclosedDivisionRoom>

      {/* 🎨 3. Product & Design Suite */}
      <EnclosedDivisionRoom
        title="PRODUCT & DESIGN"
        icon="🎨"
        color="#9333ea"
        position={[8.5, 0, -3.0]}
        size={[8.0, 5.0]}
      >
        <mesh position={[3.2, 1.2, -1.8]}>
          <boxGeometry args={[0.05, 1.1, 1.6]} />
          <meshStandardMaterial color="#a855f7" emissive="#c084fc" emissiveIntensity={0.4} />
        </mesh>
      </EnclosedDivisionRoom>

      {/* 📢 4. Marketing Division Room */}
      <EnclosedDivisionRoom
        title="MARKETING DIVISION"
        icon="📢"
        color="#16a34a"
        position={[8.5, 0, 3.5]}
        size={[8.0, 5.0]}
      >
        <mesh position={[0, 1.3, -2.4]}>
          <boxGeometry args={[1.8, 1.0, 0.05]} />
          <meshStandardMaterial color="#14532d" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      </EnclosedDivisionRoom>

      {/* 🚀 5. Sales & BD Division Suite */}
      <EnclosedDivisionRoom
        title="SALES & BD DIVISION"
        icon="🚀"
        color="#ea580c"
        position={[-8.5, 4.5, -3.0]}
        size={[8.0, 5.0]}
      >
        <mesh position={[0, 1.3, -2.4]}>
          <boxGeometry args={[2.0, 0.9, 0.05]} />
          <meshStandardMaterial color="#7c2d12" emissive="#f97316" emissiveIntensity={0.5} />
        </mesh>
      </EnclosedDivisionRoom>

      {/* ⚖️ 6. Finance & Legal Suite */}
      <EnclosedDivisionRoom
        title="FINANCE & LEGAL"
        icon="⚖"
        color="#ca8a04"
        position={[0, 4.5, -3.0]}
        size={[7.0, 5.0]}
      >
        <mesh castShadow position={[-2.6, 0.6, -1.8]}>
          <boxGeometry args={[0.7, 1.2, 0.5]} />
          <meshStandardMaterial color="#451a03" roughness={0.3} metalness={0.7} />
        </mesh>
      </EnclosedDivisionRoom>

      {/* 👥 7. HR & Operations Suite */}
      <EnclosedDivisionRoom
        title="HR & OPERATIONS"
        icon="👥"
        color="#0d9488"
        position={[8.5, 4.5, -3.0]}
        size={[8.0, 5.0]}
      >
        <group position={[3.1, 0, -1.8]}>
          <mesh castShadow position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.25, 0.18, 0.6, 16]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh castShadow position={[0, 0.8, 0]}>
            <dodecahedronGeometry args={[0.45, 1]} />
            <meshStandardMaterial color="#15803d" />
          </mesh>
        </group>
      </EnclosedDivisionRoom>
    </group>
  );
}

// ==========================================
// 3. KARAKTER 3D DENGAN MATERIAL BERTEKSTUR
// ==========================================
function DiverseSimsCharacter({
  agent,
  state,
  emote,
}: {
  agent: Agent;
  state: "WALKING" | "TYPING" | "SITTING" | "STANDING" | "CLIMBING" | "EATING" | "DRINKING" | "CHATTING";
  emote?: string;
}) {
  const traits = useMemo(() => getAgentAppearance(agent), [agent]);

  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  const isFemale = traits.gender === "female";
  const isCEO = agent.role === "CEO";

  useFrame((threeState) => {
    const t = threeState.clock.getElapsedTime();

    if (state === "WALKING" || state === "CLIMBING") {
      const speed = state === "CLIMBING" ? 7 : 9;
      const legCycle = Math.sin(t * speed);
      const armCycle = Math.sin(t * speed);

      if (leftLegRef.current) leftLegRef.current.rotation.x = legCycle * 0.55;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legCycle * 0.55;

      if (leftKneeRef.current) leftKneeRef.current.rotation.x = legCycle > 0 ? legCycle * 0.6 : 0.05;
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = legCycle < 0 ? -legCycle * 0.6 : 0.05;

      if (leftArmRef.current) leftArmRef.current.rotation.x = -armCycle * 0.45;
      if (rightArmRef.current) rightArmRef.current.rotation.x = armCycle * 0.45;

      if (bodyRef.current) {
        bodyRef.current.position.y = 0.48 + Math.abs(Math.sin(t * speed * 2)) * 0.04;
        bodyRef.current.rotation.z = Math.sin(t * (speed / 2)) * (isFemale ? 0.04 : 0.02);
      }
      if (headRef.current) headRef.current.rotation.y = Math.sin(t * 2) * 0.05;
    } else if (state === "TYPING" || state === "SITTING") {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.PI / 2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.PI / 2;
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = Math.PI / 2;
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = Math.PI / 2;

      if (state === "TYPING") {
        if (leftArmRef.current) leftArmRef.current.rotation.x = -1.1 + Math.sin(t * 18) * 0.06;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -1.1 + Math.cos(t * 18) * 0.06;
      } else {
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.6;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.6;
      }

      if (bodyRef.current) bodyRef.current.position.y = 0.22;
      if (headRef.current) headRef.current.rotation.x = 0.08 + Math.sin(t * 3) * 0.03;
    } else if (state === "EATING") {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.PI / 2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.PI / 2;
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = Math.PI / 2;
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = Math.PI / 2;

      if (rightArmRef.current) rightArmRef.current.rotation.x = -1.4 + Math.sin(t * 4) * 0.2;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.5;

      if (bodyRef.current) bodyRef.current.position.y = 0.22;
      if (headRef.current) headRef.current.rotation.x = 0.1 + Math.sin(t * 8) * 0.05;
    } else if (state === "DRINKING") {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.PI / 2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.PI / 2;
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = Math.PI / 2;
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = Math.PI / 2;

      if (rightArmRef.current) rightArmRef.current.rotation.x = -1.6 + Math.sin(t * 3) * 0.15;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.4;

      if (bodyRef.current) bodyRef.current.position.y = 0.22;
      if (headRef.current) headRef.current.rotation.x = -0.15 + Math.sin(t * 3) * 0.08;
    } else if (state === "CHATTING") {
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.PI / 2;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.PI / 2;
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = Math.PI / 2;
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = Math.PI / 2;

      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.7 + Math.sin(t * 6) * 0.2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.7 + Math.cos(t * 6) * 0.2;

      if (bodyRef.current) bodyRef.current.position.y = 0.22;
      if (headRef.current) headRef.current.rotation.y = Math.sin(t * 2) * 0.15;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = 0;
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.1;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.1;

      if (bodyRef.current) bodyRef.current.position.y = 0.48 + Math.sin(t * 2) * 0.015;
      if (headRef.current) headRef.current.rotation.y = Math.sin(t * 0.8) * 0.12;
    }
  });

  return (
    <group ref={bodyRef} position={[0, 0.48, 0]}>
      {/* Emote Bubble */}
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

        {isFemale ? (
          <mesh position={[0, -0.06, 0.18]}>
            <boxGeometry args={[0.06, 0.02, 0.02]} />
            <meshBasicMaterial color="#e11d48" />
          </mesh>
        ) : traits.hasBeard ? (
          <mesh position={[0, -0.07, 0.12]}>
            <boxGeometry args={[0.18, 0.08, 0.12]} />
            <meshStandardMaterial color={traits.hairColor} />
          </mesh>
        ) : null}

        {traits.hasGlasses && (
          <group position={[0, 0.02, 0.16]}>
            <mesh position={[-0.07, 0, 0]}>
              <boxGeometry args={[0.07, 0.05, 0.02]} />
              <meshStandardMaterial color="#0284c7" transparent opacity={0.7} />
            </mesh>
            <mesh position={[0.07, 0, 0]}>
              <boxGeometry args={[0.07, 0.05, 0.02]} />
              <meshStandardMaterial color="#0284c7" transparent opacity={0.7} />
            </mesh>
          </group>
        )}

        {/* Rambut */}
        <group position={[0, 0.05, 0]}>
          {traits.hairStyle === "PONYTAIL" && (
            <group>
              <mesh position={[0, 0.08, -0.02]}>
                <sphereGeometry args={[0.21, 16, 16]} />
                <meshStandardMaterial color={traits.hairColor} />
              </mesh>
              <mesh position={[0, 0.02, -0.24]} rotation={[0.4, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.07, 0.28, 16]} />
                <meshStandardMaterial color={traits.hairColor} />
              </mesh>
            </group>
          )}

          {traits.hairStyle === "BOB_CUT" && (
            <mesh position={[0, 0.02, -0.02]}>
              <cylinderGeometry args={[0.22, 0.24, 0.28, 16]} />
              <meshStandardMaterial color={traits.hairColor} />
            </mesh>
          )}

          {traits.hairStyle === "BUN_UPDO" && (
            <group>
              <mesh position={[0, 0.08, -0.02]}>
                <sphereGeometry args={[0.21, 16, 16]} />
                <meshStandardMaterial color={traits.hairColor} />
              </mesh>
              <mesh position={[0, 0.24, -0.08]}>
                <sphereGeometry args={[0.09, 16, 16]} />
                <meshStandardMaterial color={traits.hairColor} />
              </mesh>
            </group>
          )}

          {traits.hairStyle === "SLICK_BACK" && (
            <mesh position={[0, 0.1, -0.02]} rotation={[-0.2, 0, 0]}>
              <boxGeometry args={[0.38, 0.12, 0.38]} />
              <meshStandardMaterial color={traits.hairColor} />
            </mesh>
          )}

          {traits.hairStyle === "AFRO" && (
            <mesh position={[0, 0.08, -0.02]}>
              <sphereGeometry args={[0.28, 16, 16]} />
              <meshStandardMaterial color={traits.hairColor} />
            </mesh>
          )}

          {["SHORT_CROP", "BUZZ_CUT", "CURLY_SHORT", "CURLY_LONG", "LONG_STRAIGHT"].includes(traits.hairStyle) && (
            <mesh position={[0, 0.08, -0.02]}>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshStandardMaterial color={traits.hairColor} />
            </mesh>
          )}
        </group>
      </group>

      {/* Torso */}
      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={isFemale ? [0.14, 0.16, 0.4, 16] : [0.2, 0.16, 0.42, 16]} />
        <meshStandardMaterial color={isCEO ? "#1e293b" : traits.topColor} roughness={0.3} />
      </mesh>

      {/* Lengan */}
      <group ref={leftArmRef} position={isFemale ? [-0.18, 0.42, 0] : [-0.23, 0.42, 0]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.04, 0.22, 8, 16]} />
          <meshStandardMaterial color={isCEO ? "#1e293b" : traits.topColor} />
        </mesh>
        <mesh position={[0, -0.28, 0]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color={traits.skinColor} />
        </mesh>
      </group>

      <group ref={rightArmRef} position={isFemale ? [0.18, 0.42, 0] : [0.23, 0.42, 0]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.04, 0.22, 8, 16]} />
          <meshStandardMaterial color={isCEO ? "#1e293b" : traits.topColor} />
        </mesh>
        <mesh position={[0, -0.28, 0]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshStandardMaterial color={traits.skinColor} />
        </mesh>

        {state === "EATING" && (
          <mesh position={[0, -0.32, 0.08]}>
            <cylinderGeometry args={[0.08, 0.01, 0.02, 16]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
        )}
        {state === "DRINKING" && (
          <mesh position={[0, -0.32, 0.08]}>
            <cylinderGeometry args={[0.04, 0.03, 0.09, 16]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        )}
      </group>

      {/* Rok/Celana */}
      {traits.bottomType === "SKIRT" && (
        <mesh position={[0, 0.05, 0]}>
          <coneGeometry args={[0.22, 0.22, 16]} />
          <meshStandardMaterial color={traits.bottomColor} />
        </mesh>
      )}

      {/* Kaki */}
      <group ref={leftLegRef} position={[-0.09, 0.08, 0]}>
        <mesh castShadow position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.045, 0.18, 8, 16]} />
          <meshStandardMaterial color={traits.bottomType === "SKIRT" ? traits.skinColor : traits.bottomColor} />
        </mesh>
        <group ref={leftKneeRef} position={[0, -0.2, 0]}>
          <mesh castShadow position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.04, 0.18, 8, 16]} />
            <meshStandardMaterial color={traits.bottomType === "SKIRT" ? traits.skinColor : traits.bottomColor} />
          </mesh>
          <mesh castShadow position={[0, -0.2, 0.04]}>
            <boxGeometry args={[0.08, 0.06, 0.14]} />
            <meshStandardMaterial color={traits.shoeColor} />
          </mesh>
        </group>
      </group>

      <group ref={rightLegRef} position={[0.09, 0.08, 0]}>
        <mesh castShadow position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.045, 0.18, 8, 16]} />
          <meshStandardMaterial color={traits.bottomType === "SKIRT" ? traits.skinColor : traits.bottomColor} />
        </mesh>
        <group ref={rightKneeRef} position={[0, -0.2, 0]}>
          <mesh castShadow position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.04, 0.18, 8, 16]} />
            <meshStandardMaterial color={traits.bottomType === "SKIRT" ? traits.skinColor : traits.bottomColor} />
          </mesh>
          <mesh castShadow position={[0, -0.2, 0.04]}>
            <boxGeometry args={[0.08, 0.06, 0.14]} />
            <meshStandardMaterial color={traits.shoeColor} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ==========================================
// 4. AREA KANTIN & MEZZANINE LOUNGE
// ==========================================
function CanteenArea() {
  return (
    <group>
      <group position={[-8.5, 0, 6.2]}>
        <mesh castShadow position={[0, 0.45, 0]}>
          <boxGeometry args={[2.2, 0.9, 0.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.1} />
        </mesh>
        <mesh castShadow position={[0, 0.92, 0]}>
          <boxGeometry args={[2.3, 0.06, 0.9]} />
          <meshStandardMaterial color="#d97706" roughness={0.2} />
        </mesh>
        <mesh castShadow position={[-0.6, 1.15, 0]}>
          <boxGeometry args={[0.5, 0.42, 0.4]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh castShadow position={[0.5, 1.1, 0]}>
          <boxGeometry args={[0.6, 0.3, 0.35]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.4} />
        </mesh>
      </group>

      <group position={[-5.5, 0, 5.2]}>
        <mesh castShadow position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.65, 0.65, 0.05, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.36, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>

        {[-0.7, 0.7].map((x, i) => (
          <group key={i} position={[x, 0, 0]} rotation={[0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <mesh castShadow position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
              <meshStandardMaterial color="#0284c7" roughness={0.3} />
            </mesh>
            <mesh castShadow position={[0, 0.42, -0.18]}>
              <boxGeometry args={[0.38, 0.35, 0.04]} />
              <meshStandardMaterial color="#0284c7" roughness={0.3} />
            </mesh>
          </group>
        ))}

        <mesh position={[-0.15, 0.41, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.01, 16]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
        <mesh position={[0.15, 0.41, 0]}>
          <cylinderGeometry args={[0.04, 0.03, 0.08, 16]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>

      <group position={[-5.5, 0, 7.2]}>
        <mesh castShadow position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.65, 0.65, 0.05, 32]} />
          <meshStandardMaterial color="#ffffff" roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.36, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>

        {[-0.7, 0.7].map((x, i) => (
          <group key={i} position={[x, 0, 0]} rotation={[0, i === 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <mesh castShadow position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
              <meshStandardMaterial color="#16a34a" roughness={0.3} />
            </mesh>
            <mesh castShadow position={[0, 0.42, -0.18]}>
              <boxGeometry args={[0.38, 0.35, 0.04]} />
              <meshStandardMaterial color="#16a34a" roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>

      <group position={[-5, 4.5, 2.0]}>
        <mesh castShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[1.8, 0.25, 0.8]} />
          <meshStandardMaterial color="#9333ea" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 0.45, -0.35]}>
          <boxGeometry args={[1.8, 0.45, 0.15]} />
          <meshStandardMaterial color="#7e22ce" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// ==========================================
// 5. MEJA KERJA STATIS DENGAN MONITOR & AKSESORIS
// ==========================================
function StaticWorkstationDesk({ color, isWorking }: { color: string; isWorking: boolean }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.38, -0.15]}>
        <boxGeometry args={[1.4, 0.06, 0.7]} />
        <meshStandardMaterial color="#fde68a" roughness={0.2} metalness={0.05} />
      </mesh>

      {[-0.65, 0.65].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.18, -0.15]}>
          <boxGeometry args={[0.06, 0.36, 0.6]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      <group position={[0, 0.65, -0.38]}>
        <mesh castShadow position={[-0.28, 0, 0]} rotation={[0, 0.1, 0]}>
          <boxGeometry args={[0.48, 0.28, 0.02]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive={isWorking ? "#38bdf8" : "#0284c7"}
            emissiveIntensity={isWorking ? 1.0 : 0.3}
            roughness={0.2}
          />
        </mesh>
        <mesh castShadow position={[0.28, 0, 0]} rotation={[0, -0.1, 0]}>
          <boxGeometry args={[0.48, 0.28, 0.02]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive={isWorking ? "#a855f7" : "#818cf8"}
            emissiveIntensity={isWorking ? 0.8 : 0.3}
            roughness={0.2}
          />
        </mesh>
      </group>

      <group position={[0, 0, 0.25]}>
        <mesh castShadow position={[0, 0.26, 0]}>
          <boxGeometry args={[0.45, 0.05, 0.45]} />
          <meshStandardMaterial color="#2563eb" roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0, 0.52, 0.2]}>
          <boxGeometry args={[0.42, 0.48, 0.05]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// ==========================================
// 6. TANGGA L-SHAPE ARSITEKTURAL REALISTIS
// ==========================================
function Staircase3D() {
  const flight1Steps = 9;
  const flight2Steps = 9;

  return (
    <group position={[-11, 0, 0]}>
      {Array.from({ length: flight1Steps }).map((_, i) => {
        const y = (i + 1) * 0.25;
        const z = 1.0 - i * 0.5;
        return (
          <mesh key={`f1-${i}`} castShadow receiveShadow position={[0, y, z]}>
            <boxGeometry args={[1.4, 0.08, 0.48]} />
            <meshStandardMaterial color="#d97706" roughness={0.2} metalness={0.1} />
          </mesh>
        );
      })}

      <mesh receiveShadow position={[0, 2.25, -3.8]}>
        <boxGeometry args={[1.8, 0.12, 1.8]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.2} />
      </mesh>

      {Array.from({ length: flight2Steps }).map((_, i) => {
        const x = (i + 1) * 0.4;
        const y = 2.25 + (i + 1) * 0.25;
        return (
          <mesh key={`f2-${i}`} castShadow receiveShadow position={[x, y, -3.8]}>
            <boxGeometry args={[0.48, 0.08, 1.4]} />
            <meshStandardMaterial color="#d97706" roughness={0.2} metalness={0.1} />
          </mesh>
        );
      })}

      <mesh position={[-0.75, 1.2, -1.2]} rotation={[0.46, 0, 0]}>
        <boxGeometry args={[0.04, 0.8, 4.2]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.3} roughness={0.1} />
      </mesh>
      <mesh position={[1.8, 3.4, -3.8]} rotation={[0, 0, -0.55]}>
        <boxGeometry args={[3.8, 0.8, 0.04]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.3} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ==========================================
// 7. LIFT KACA DENGAN PINTU OTOMATIS & INDIKATOR DYNAMIC
// ==========================================
function GlassElevator3D() {
  const [cabinY, setCabinY] = useState(0);
  const [doorProgress, setDoorProgress] = useState(0);

  useFrame((_, delta) => {
    globalElevator.update(delta);
    setCabinY(globalElevator.currentY);
    setDoorProgress(globalElevator.doorOpenProgress);
  });

  const doorOffset = doorProgress * 0.55;

  return (
    <group position={[11, 0, 1]}>
      {[
        [-1.0, -1.0],
        [1.0, -1.0],
        [-1.0, 1.0],
        [1.0, 1.0],
      ].map(([px, pz], i) => (
        <mesh key={i} position={[px, 4.25, pz]}>
          <cylinderGeometry args={[0.07, 0.07, 9.5, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      <mesh position={[0, 4.25, 0]}>
        <boxGeometry args={[2.1, 9.5, 2.1]} />
        <meshStandardMaterial color="#0284c7" transparent opacity={0.15} roughness={0.05} />
      </mesh>

      <mesh position={[0, 9.1, 0]}>
        <boxGeometry args={[2.3, 0.4, 2.3]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>

      {[0, 4.5].map((fy, i) => {
        const isCurrentFloor = Math.abs(cabinY - fy) < 0.2;
        const arrowDirection = globalElevator.targetY > cabinY ? "▲" : globalElevator.targetY < cabinY ? "▼" : "●";

        return (
          <group key={i} position={[0, fy + 1.1, 1.05]}>
            <Html position={[0, 1.25, 0.08]} center>
              <div className="bg-slate-900 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/50 shadow flex items-center gap-1">
                <span>{arrowDirection}</span>
                <span>{i === 0 ? "L1" : "L2"}</span>
              </div>
            </Html>

            {isCurrentFloor && (
              <>
                <mesh position={[-0.35 - doorOffset, 0, 0]}>
                  <boxGeometry args={[0.65, 1.8, 0.02]} />
                  <meshStandardMaterial color="#0284c7" transparent opacity={0.4} metalness={0.5} />
                </mesh>
                <mesh position={[0.35 + doorOffset, 0, 0]}>
                  <boxGeometry args={[0.65, 1.8, 0.02]} />
                  <meshStandardMaterial color="#0284c7" transparent opacity={0.4} metalness={0.5} />
                </mesh>
              </>
            )}
          </group>
        );
      })}

      <group position={[0, cabinY + 0.9, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.8, 2.0, 1.8]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.35} metalness={0.7} roughness={0.1} />
        </mesh>
        <mesh position={[0, -0.95, 0]}>
          <boxGeometry args={[1.75, 0.08, 1.75]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
        <pointLight color="#fef08a" intensity={2.5} distance={4} />
      </group>
    </group>
  );
}

// ==========================================
// 8. NAVIGASI AGEN OTONOM
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
  const isFloor2 = ["Sales & BD", "Finance & Legal", "HR & Operations"].includes(agent.division);
  const homeY = isFloor2 ? 4.5 : 0;
  const homeZ = isFloor2 && agent.position_z > 0 ? agent.position_z - 10.0 : agent.position_z;
  const homeX = agent.position_x;
  const chairZ = homeZ + 0.25;

  const [currentPos, setCurrentPos] = useState({ x: homeX, y: homeY, z: chairZ });
  const [waypointQueue, setWaypointQueue] = useState<Waypoint[]>([]);
  const [animState, setAnimState] = useState<"WALKING" | "TYPING" | "SITTING" | "STANDING" | "CLIMBING" | "EATING" | "DRINKING" | "CHATTING">("TYPING");
  const [emote, setEmote] = useState<string | undefined>(undefined);
  const [rotationY, setRotationY] = useState(Math.PI);
  const [isInElevator, setIsInElevator] = useState(false);

  const color = DIVISION_COLORS[agent.division] || "#64748b";

  useEffect(() => {
    const interval = setInterval(() => {
      if (isBackendWorking) {
        setWaypointQueue([{ x: homeX, y: homeY, z: chairZ, name: "Meja Kerja 💼" }]);
        setAnimState("TYPING");
        setEmote("⚡ THINKING...");
        setRotationY(Math.PI);
        onStatusUpdate(agent.id, `${agent.name} sedang memproses instruksi AI...`);
        return;
      }

      if (Math.random() < 0.45) {
        const destinationOptions = [
          { dest: WORKSPACES.CANTEEN_TABLE_1_A, state: "EATING" as const, emote: "🍕 Makan Pizza", msg: "makan pizza di Kantin" },
          { dest: WORKSPACES.CANTEEN_TABLE_1_B, state: "CHATTING" as const, emote: "💬 Ngobrol Kantin", msg: "ngobrol santai di Kantin" },
          { dest: WORKSPACES.CANTEEN_TABLE_2_A, state: "DRINKING" as const, emote: "☕ Ngopi Bareng", msg: "minum kopi di Kantin" },
          { dest: WORKSPACES.COFFEE_COUNTER, state: "STANDING" as const, emote: "☕ Pesan Kopi", msg: "memesan espresso di Barista Counter" },
          { dest: WORKSPACES.LOUNGE_L2, state: "CHATTING" as const, emote: "🛋 Relax L2", msg: "bersantai di Lounge L2" },
          { dest: WORKSPACES.BALCONY_L2, state: "STANDING" as const, emote: "🌿 Santai Balkon", msg: "melihat pemandangan dari Balkon L2" },
        ];

        const chosen = destinationOptions[Math.floor(Math.random() * destinationOptions.length)];
        const needsFloorChange = (homeY === 4.5 && chosen.dest.y === 0) || (homeY === 0 && chosen.dest.y === 4.5);

        let queue: Waypoint[] = [];
        if (needsFloorChange) {
          const useStairs = Math.random() < 0.4;
          if (useStairs) {
            queue = [
              WORKSPACES.STAIRS_BOTTOM,
              WORKSPACES.STAIRS_LANDING,
              WORKSPACES.STAIRS_TOP,
              chosen.dest,
            ];
            onStatusUpdate(agent.id, `${agent.name} meniti tangga L-shape...`);
          } else {
            const doorWP = homeY === 0 ? WORKSPACES.ELEVATOR_DOOR_L1 : WORKSPACES.ELEVATOR_DOOR_L2;
            const cabinWP = homeY === 0 ? WORKSPACES.ELEVATOR_CABIN_L1 : WORKSPACES.ELEVATOR_CABIN_L2;
            const exitDoorWP = homeY === 0 ? WORKSPACES.ELEVATOR_DOOR_L2 : WORKSPACES.ELEVATOR_DOOR_L1;

            queue = [doorWP, cabinWP, exitDoorWP, chosen.dest];
            onStatusUpdate(agent.id, `${agent.name} berjalan ke pintu lift...`);
          }
        } else {
          queue = [chosen.dest];
          onStatusUpdate(agent.id, `${agent.name} ${chosen.msg}`);
        }

        setWaypointQueue(queue);
        setEmote(chosen.emote);

        setTimeout(() => {
          setWaypointQueue([{ x: homeX, y: homeY, z: chairZ, name: "Meja Kerja 💼" }]);
          setEmote("💼 Meja Kerja");
          onStatusUpdate(agent.id, `${agent.name} kembali ke meja kerja`);
        }, 12000);
      }
    }, 12000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, [isBackendWorking, homeX, homeY, homeZ, chairZ, agent.id, agent.name]);

  useFrame((_, delta) => {
    if (waypointQueue.length === 0) return;

    const target = waypointQueue[0];
    const targetName = target?.name || "";

    if (
      (targetName.includes("Depan Pintu Lift") || targetName.includes("Dalam Kabin Lift")) &&
      !isInElevator
    ) {
      const fromFloorY = currentPos.y < 2 ? 0 : 4.5;
      const canEnter = globalElevator.requestRide(agent.id, fromFloorY);

      if (!canEnter) {
        const queueIdx = globalElevator.getQueueIndex(agent.id, fromFloorY);
        const queueZ = 2.5 + (queueIdx + 1) * 0.7;

        setCurrentPos((prev) => ({ ...prev, z: queueZ }));
        setAnimState("STANDING");
        setEmote(`⏳ Antri Lift (${queueIdx + 1})`);
        return;
      } else if (targetName.includes("Dalam Kabin Lift")) {
        globalElevator.board(agent.id, fromFloorY);
        setIsInElevator(true);
        setEmote("🛗 Naik Lift");
      }
    }

    if (isInElevator) {
      setCurrentPos((prev) => ({ ...prev, y: globalElevator.currentY, x: 11, z: 1.0 }));

      const targetFloorY = homeY === 0 ? 4.5 : 0;
      if (Math.abs(globalElevator.currentY - targetFloorY) < 0.1 && globalElevator.doorOpenProgress > 0.5) {
        globalElevator.exit(agent.id);
        setIsInElevator(false);
        setWaypointQueue((prev) => prev.slice(1));
      }
      return;
    }

    const dx = target.x - currentPos.x;
    const dz = target.z - currentPos.z;
    const dy = target.y - currentPos.y;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.12 || Math.abs(dy) > 0.1) {
      const speed = 2.5 * delta;
      const nx = currentPos.x + (dx / (dist || 1)) * Math.min(speed, dist);
      const nz = currentPos.z + (dz / (dist || 1)) * Math.min(speed, dist);
      const ny = currentPos.y + Math.sign(dy) * Math.min(speed, Math.abs(dy));

      setCurrentPos({ x: nx, y: ny, z: nz });
      setRotationY(Math.atan2(dx, dz));
      setAnimState(Math.abs(dy) > 0.05 ? "CLIMBING" : "WALKING");
    } else {
      setWaypointQueue((prev) => prev.slice(1));
      if (waypointQueue.length === 1) {
        if (target.x === homeX && target.z === chairZ) {
          setAnimState("TYPING");
          setEmote(undefined);
          setRotationY(Math.PI);
        } else {
          setAnimState("SITTING");
        }
      }
    }
  });

  return (
    <group position={[currentPos.x, currentPos.y, currentPos.z]} rotation={[0, rotationY, 0]}>
      <group
        onClick={(e) => {
          e.stopPropagation();
          onSelect(agent);
        }}
        scale={isSelected ? 1.15 : 1.0}
      >
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
// 9. STRUKTUR GEDUNG UTAMA LANTAI 1 & LANTAI 2
// ==========================================
function BuildingStructure() {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 22]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.1} metalness={0.05} />
      </mesh>
      <gridHelper args={[28, 28, "#cbd5e1", "#e2e8f0"]} position={[0, -0.04, 0]} />

      <group position={[0, 4.4, 0]}>
        <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28, 22]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.3} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.5, 10.9]}>
          <boxGeometry args={[27.8, 1.0, 0.08]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.3} roughness={0.1} />
        </mesh>
      </group>

      {[
        [-13, -10],
        [13, -10],
        [-13, 10],
        [13, 10],
      ].map(([px, pz], i) => (
        <mesh key={i} position={[px, 2.25, pz]}>
          <cylinderGeometry args={[0.25, 0.25, 4.5, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

// ==========================================
// 10. KOMPONEN UTAMA OFFICE CANVAS
// ==========================================
export default function OfficeCanvas() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
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

  // MEMUAT SELURUH 36 AGENT LENGKAP BILA BACKEND TERDAPAT DELAY/FALLBACK
  const get36FullMockAgents = (): Agent[] => [
    // 0. Executive (CEO)
    {
      id: "ceo-main",
      name: "Pak Pakar (CEO)",
      division: "Executive",
      role: "CEO",
      system_prompt: "Kamu adalah CEO/Chief Executive Officer. Tugasmu menganalisis strategi perusahaan skala besar, menentukan divisi mana saja yang harus bergerak, dan menyusun laporan konsolidasi eksekutif.",
      position_x: 0.0,
      position_y: 0.0,
      position_z: -3.0,
      status: "Active",
    },

    // 1. Technology Division
    {
      id: "tech-lead",
      name: "Alex (Tech Lead)",
      division: "Technology",
      role: "Manager",
      system_prompt: "Kamu adalah Tech Lead. Tugasmu menganalisis arsitektur sistem, memecah brief teknis, dan mengkoordinasikan tim developer.",
      position_x: -6.5,
      position_y: 0.0,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "fe-dev-1",
      name: "Siti (Frontend Dev)",
      division: "Technology",
      role: "Specialist",
      system_prompt: "Kamu adalah Web Frontend Developer spesialis React, Next.js, TailwindCSS, dan WebGL.",
      position_x: -8.5,
      position_y: 0.0,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "fe-dev-2",
      name: "Rian (Mobile Dev)",
      division: "Technology",
      role: "Specialist",
      system_prompt: "Kamu adalah Mobile App Developer spesialis Flutter dan React Native.",
      position_x: -10.5,
      position_y: 0.0,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "be-dev-1",
      name: "Budi (Backend Dev)",
      division: "Technology",
      role: "Specialist",
      system_prompt: "Kamu adalah Backend Developer ahli Python FastAPI, Node.js, dan arsitektur Microservices.",
      position_x: -6.5,
      position_y: 0.0,
      position_z: -4.0,
      status: "Active",
    },
    {
      id: "be-dev-2",
      name: "Dedi (DevOps Eng)",
      division: "Technology",
      role: "Specialist",
      system_prompt: "Kamu adalah DevOps Engineer ahli Docker, Kubernetes, CI/CD pipeline, dan cloud deployment.",
      position_x: -8.5,
      position_y: 0.0,
      position_z: -4.0,
      status: "Active",
    },
    {
      id: "qa-eng",
      name: "Maya (QA Lead)",
      division: "Technology",
      role: "Specialist",
      system_prompt: "Kamu adalah Quality Assurance Engineer spesialis automated testing, end-to-end test, dan bug tracking.",
      position_x: -10.5,
      position_y: 0.0,
      position_z: -4.0,
      status: "Active",
    },

    // 2. Product & Design Division
    {
      id: "product-head",
      name: "Diana (Head of Product)",
      division: "Product & Design",
      role: "Manager",
      system_prompt: "Kamu adalah Head of Product. Tugasmu merancang PRD, menentukan prioritas backlog, dan mengelola roadmap produk.",
      position_x: 6.5,
      position_y: 0.0,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "uiux-1",
      name: "Kevin (UI/UX Lead)",
      division: "Product & Design",
      role: "Specialist",
      system_prompt: "Kamu adalah UI/UX Lead yang ahli membuat Wireframe, Figma Prototype, dan Design System.",
      position_x: 8.5,
      position_y: 0.0,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "uiux-2",
      name: "Nadia (UX Researcher)",
      division: "Product & Design",
      role: "Specialist",
      system_prompt: "Kamu adalah UX Researcher yang berfokus pada user interview, usability testing, dan pemetaan persona.",
      position_x: 10.5,
      position_y: 0.0,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "design-3d",
      name: "Raka (3D Artist)",
      division: "Product & Design",
      role: "Specialist",
      system_prompt: "Kamu adalah 3D Modeler & Motion Designer ahli Blender dan aset WebGL.",
      position_x: 6.5,
      position_y: 0.0,
      position_z: -4.0,
      status: "Active",
    },
    {
      id: "graphic-des",
      name: "Sari (Graphic Designer)",
      division: "Product & Design",
      role: "Specialist",
      system_prompt: "Kamu adalah Graphic Designer pengembang aset visual marketing, ilustrasi, dan identitas brand.",
      position_x: 8.5,
      position_y: 0.0,
      position_z: -4.0,
      status: "Active",
    },
    {
      id: "scrum-master",
      name: "Bagas (Scrum Master)",
      division: "Product & Design",
      role: "Specialist",
      system_prompt: "Kamu adalah Scrum Master yang mengawal kelancaran sprint, daily standup, dan membuang hambatan tim.",
      position_x: 10.5,
      position_y: 0.0,
      position_z: -4.0,
      status: "Active",
    },

    // 3. Marketing Division
    {
      id: "mkt-lead",
      name: "Eko (Marketing Lead)",
      division: "Marketing",
      role: "Manager",
      system_prompt: "Kamu adalah CMO/Marketing Lead yang menyusun strategi campaign, positioning pasar, dan alokasi budget marketing.",
      position_x: 6.5,
      position_y: 0.0,
      position_z: 2.5,
      status: "Active",
    },
    {
      id: "content-writer",
      name: "Rina (Content Lead)",
      division: "Marketing",
      role: "Specialist",
      system_prompt: "Kamu adalah Content Strategist dan Copywriter spesialis artikel SEO, landing page, dan ad copy.",
      position_x: 8.5,
      position_y: 0.0,
      position_z: 2.5,
      status: "Active",
    },
    {
      id: "seo-spec",
      name: "Fajar (SEO Specialist)",
      division: "Marketing",
      role: "Specialist",
      system_prompt: "Kamu adalah SEO Specialist spesialis keyword research, technical SEO, dan link building.",
      position_x: 10.5,
      position_y: 0.0,
      position_z: 2.5,
      status: "Active",
    },
    {
      id: "social-media",
      name: "Anisa (Social Media Mgr)",
      division: "Marketing",
      role: "Specialist",
      system_prompt: "Kamu adalah Social Media Manager pengelola konten Instagram, TikTok, LinkedIn, dan X.",
      position_x: 6.5,
      position_y: 0.0,
      position_z: 4.5,
      status: "Active",
    },
    {
      id: "ppc-spec",
      name: "Gilang (Performance Mkt)",
      division: "Marketing",
      role: "Specialist",
      system_prompt: "Kamu adalah Media Buyer ahli mengoptimalkan Google Ads, Meta Ads, dan conversion funnel.",
      position_x: 8.5,
      position_y: 0.0,
      position_z: 4.5,
      status: "Active",
    },
    {
      id: "pr-spec",
      name: "Tania (PR Specialist)",
      division: "Marketing",
      role: "Specialist",
      system_prompt: "Kamu adalah Public Relations Manager spesialis press release, hubungan media, dan brand communication.",
      position_x: 10.5,
      position_y: 0.0,
      position_z: 4.5,
      status: "Active",
    },

    // 4. Sales & BD Division (Lantai 2)
    {
      id: "sales-lead",
      name: "Hendra (VP of Sales)",
      division: "Sales & BD",
      role: "Manager",
      system_prompt: "Kamu adalah Head of Sales. Tugasmu memimpin strategi B2B closing, penetapan kuota sales, dan negosiasi kontrak besar.",
      position_x: -6.5,
      position_y: 4.5,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "account-exec",
      name: "Lia (Account Executive)",
      division: "Sales & BD",
      role: "Specialist",
      system_prompt: "Kamu adalah Account Executive yang menangani pitching produk ke klien, demo produk, dan deal closing.",
      position_x: -8.5,
      position_y: 4.5,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "bizdev-1",
      name: "Reza (BizDev Manager)",
      division: "Sales & BD",
      role: "Specialist",
      system_prompt: "Kamu adalah Business Development spesialis eksplorasi kemitraan strategis dan peluang pasar baru.",
      position_x: -10.5,
      position_y: 4.5,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "cust-success",
      name: "Putri (Customer Success)",
      division: "Sales & BD",
      role: "Specialist",
      system_prompt: "Kamu adalah Customer Success Manager pengelola hubungan jangka panjang dan retensi akun klien.",
      position_x: -6.5,
      position_y: 4.5,
      position_z: -4.0,
      status: "Active",
    },
    {
      id: "sales-dev",
      name: "Taufik (SDR Lead)",
      division: "Sales & BD",
      role: "Specialist",
      system_prompt: "Kamu adalah Sales Development Representative pengumpul prospek leads potensial.",
      position_x: -8.5,
      position_y: 4.5,
      position_z: -4.0,
      status: "Active",
    },
    {
      id: "crm-spec",
      name: "Vina (CRM Specialist)",
      division: "Sales & BD",
      role: "Specialist",
      system_prompt: "Kamu adalah CRM Manager spesialis HubSpot, otomatisasi email sales, dan lead scoring.",
      position_x: -10.5,
      position_y: 4.5,
      position_z: -4.0,
      status: "Active",
    },

    // 5. Finance & Legal Division (Lantai 2)
    {
      id: "fin-lead",
      name: "Bambang (CFO)",
      division: "Finance & Legal",
      role: "Manager",
      system_prompt: "Kamu adalah CFO yang mengendalikan manajemen arus kas, proyeksi keuangan, dan perencanaan budget perusahaan.",
      position_x: -1.8,
      position_y: 4.5,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "accountant",
      name: "Yuni (Senior Accountant)",
      division: "Finance & Legal",
      role: "Specialist",
      system_prompt: "Kamu adalah Senior Accountant pengelola laporan keuangan, jurnal transaksi, dan perpajakan.",
      position_x: 0.0,
      position_y: 4.5,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "legal-counsel",
      name: "Agung (Legal Counsel)",
      division: "Finance & Legal",
      role: "Specialist",
      system_prompt: "Kamu adalah Legal Counsel ahli penyusunan draf kontrak kerja sama, NDA, dan kepatuhan hukum.",
      position_x: 1.8,
      position_y: 4.5,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "payroll-spec",
      name: "Dewi (Payroll Admin)",
      division: "Finance & Legal",
      role: "Specialist",
      system_prompt: "Kamu adalah Payroll Specialist pengurus kalkulasi gaji, BPJS, dan tunjangan karyawan.",
      position_x: -1.8,
      position_y: 4.5,
      position_z: -4.0,
      status: "Active",
    },
    {
      id: "procurement",
      name: "Irfan (Procurement Mgr)",
      division: "Finance & Legal",
      role: "Specialist",
      system_prompt: "Kamu adalah Procurement Manager pengurus pengadaan sarana kerja dan negosiasi vendor.",
      position_x: 0.0,
      position_y: 4.5,
      position_z: -4.0,
      status: "Active",
    },
    {
      id: "auditor",
      name: "Citra (Internal Auditor)",
      division: "Finance & Legal",
      role: "Specialist",
      system_prompt: "Kamu adalah Internal Auditor pengawas kepatuhan prosedur keuangan operasional.",
      position_x: 1.8,
      position_y: 4.5,
      position_z: -4.0,
      status: "Active",
    },

    // 6. HR & Operations Division (Lantai 2)
    {
      id: "hr-lead",
      name: "Siska (CHRO)",
      division: "HR & Operations",
      role: "Manager",
      system_prompt: "Kamu adalah Head of HR pengelola strategi budaya kerja, struktur organisasi, dan retensi talenta.",
      position_x: 6.5,
      position_y: 4.5,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "recruiter-1",
      name: "Doni (Tech Recruiter)",
      division: "HR & Operations",
      role: "Specialist",
      system_prompt: "Kamu adalah Technical Recruiter pengurus rekrutmen talenta software engineering dan AI.",
      position_x: 8.5,
      position_y: 4.5,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "hrbp",
      name: "Indah (HRBP)",
      division: "HR & Operations",
      role: "Specialist",
      system_prompt: "Kamu adalah HR Business Partner pendamping kebutuhan operasional tiap divisi.",
      position_x: 10.5,
      position_y: 4.5,
      position_z: -2.0,
      status: "Active",
    },
    {
      id: "office-mgr",
      name: "Joko (Office Manager)",
      division: "HR & Operations",
      role: "Specialist",
      system_prompt: "Kamu adalah Office Manager pengelola fasilitas kantor dan operasional harian.",
      position_x: 7.5,
      position_y: 4.5,
      position_z: -4.0,
      status: "Active",
    },
    {
      id: "people-dev",
      name: "Laras (Learning & Dev)",
      division: "HR & Operations",
      role: "Specialist",
      system_prompt: "Kamu adalah People Development Specialist pengurus program pelatihan dan upsilling karyawan.",
      position_x: 9.5,
      position_y: 4.5,
      position_z: -4.0,
      status: "Active",
    },
  ];

  const handleStatusUpdate = (id: string, text: string) => {
    setActivityLogs((prev) => [
      { id, text, time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
      ...prev.slice(0, 7),
    ]);
  };

  const handleSelectAgent = async (agent: Agent) => {
    setSelectedAgent(agent);

    const defaultPrompt = agent.system_prompt || `Halo! Saya ${agent.name} dari divisi ${agent.division}.`;
    const initialMessage = {
      sender: agent.name,
      text: `📋 [BRIEF & ROLE AGEN]\n${defaultPrompt}`,
    };

    setMessages([initialMessage]);

    try {
      const res = await fetch(`https://office-ai-backend.vercel.app/messages/${agent.id}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        const history = data.messages.map((m: { sender: string; text: string }) => ({
          sender: m.sender === "user" ? "You" : agent.name,
          text: m.text,
        }));
        setMessages([initialMessage, ...history]);
      }
    } catch {
      // Menggunakan pesan brief awal bila riwayat belum siap
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
      setMessages((prev) => [...prev, { sender: selectedAgent.name, text: replyText || "Siap, instruksi diterima!" }]);
    } catch {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { sender: selectedAgent.name, text: `[Simulasi AI] Saya telah menerima laporan: "${userMsg}". Sedang dikerjakan!` },
        ]);
        setLoading(false);
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden font-sans select-none">
      {/* HUD Header */}
      <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur border border-slate-200 text-slate-800 p-3.5 rounded-2xl shadow-lg flex items-center gap-4">
        <div>
          <h1 className="font-bold text-sm tracking-wide flex items-center gap-2 text-indigo-900">
            <span>🏢</span> 3D AI Office HQ — 36 Active AI Agents
          </h1>
          <p className="text-xs text-slate-500">36 AI Agents across 7 Private Division Rooms & 2 Floor Layout</p>
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
      <Canvas shadows camera={{ position: [0, 18, 22], fov: 45 }}>
        <ambientLight intensity={1.1} />
        <directionalLight
          castShadow
          position={[18, 28, 16]}
          intensity={1.8}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          color="#fffbeb"
        />
        <hemisphereLight args={["#ffffff", "#cbd5e1", 0.7]} />

        <ContactShadows opacity={0.45} scale={35} blur={1.5} far={10} color="#000000" />

        {/* Gedung, Tangga, Lift, Kantin & Ruangan Divisi Privat */}
        <BuildingStructure />
        <AllDivisionRooms />
        <Staircase3D />
        <GlassElevator3D />
        <CanteenArea />

        {/* Meja Kerja Statis untuk Seluruh 36 Agen */}
        {agents.map((agent) => {
          const isFloor2 = ["Sales & BD", "Finance & Legal", "HR & Operations"].includes(agent.division);
          const homeY = isFloor2 ? 4.5 : 0;
          const homeZ = isFloor2 && agent.position_z > 0 ? agent.position_z - 10.0 : agent.position_z;
          const homeX = agent.position_x;
          const isAgentWorking = loading && selectedAgent?.id === agent.id;
          const color = DIVISION_COLORS[agent.division] || "#64748b";

          return (
            <group key={`desk-${agent.id}`} position={[homeX, homeY, homeZ]}>
              <StaticWorkstationDesk color={color} isWorking={isAgentWorking} />
            </group>
          );
        })}

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

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} minDistance={5} maxDistance={38} />
      </Canvas>

      {/* Sidebar Chat */}
      {selectedAgent && (
        <div className="absolute top-0 right-0 w-96 h-full bg-white/95 border-l border-slate-200 backdrop-blur text-slate-800 p-4 flex flex-col z-20 shadow-2xl">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <div>
              <h2 className="font-bold text-base flex items-center gap-2 text-indigo-900">
                <span>👤</span> {selectedAgent.name}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedAgent.division} • {selectedAgent.role}
              </p>
            </div>
            <button onClick={() => setSelectedAgent(null)} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg text-xs">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto my-3 space-y-3 text-xs pr-1">
            {messages.length === 0 && <p className="text-slate-400 text-center mt-10">Mulai obrolan dengan {selectedAgent.name}...</p>}
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
            {loading && <div className="text-amber-600 text-xs animate-pulse">⚡ {selectedAgent.name} sedang berpikir...</div>}
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={`Kirim pesan ke ${selectedAgent.name}...`}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
            />
            <button onClick={handleSendMessage} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-xl font-medium shadow">
              Kirim
            </button>
          </div>
        </div>
      )}
    </div>
  );
}