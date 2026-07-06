import React from "react";
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Shield,
  Zap,
  BarChart,
  MessageSquare,
  ArrowRight,
  Globe,
  BrainCircuit,
  Mail,
  
} from "lucide-react";
import './Landing.css';

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 30,
  },

  show: {
    opacity: 1,
    y: 0,

    transition: {
      duration: 0.6,
    },
  },
};

const stagger = {
  hidden: {},

  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
}; 

export default function Landing() {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll({
  offset: ["start start", "end start"],
});// Resilient: tracks window scroll

 const y1 = useTransform(
  scrollYProgress,
  [0, 1],
  [0, -250]
);
  const opacity = useTransform(
  scrollYProgress,
  [0, 0.35],
  [1, 0]
);

  return (
    <div className="landing-root relative bg-paper selection:bg-brass/20 selection:text-ink min-h-screen scroll-smooth">
      {/* Background Decor */}
      <div className="landing-grid-bg" />
      <div className="gemini-glow" />

      {/* Premium Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-ink/5 bg-white/70">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
              <BrainCircuit className="text-paper" size={18} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">SCIP</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium opacity-70">
            <a href="#features" className="hover:text-ink transition-colors">Capabilities</a>
            <a href="#how-it-works" className="hover:text-ink transition-colors">Framework</a>
            <a href="#stats" className="hover:text-ink transition-colors">Impact</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-bold hover:opacity-70 transition-opacity"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="bg-ink text-paper px-5 py-2 rounded-full text-sm font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-48 px-6 overflow-hidden">
        <motion.div style={{ y: y1, opacity }} className="max-w-6xl mx-auto text-center relative z-10">
         <motion.div
variants={stagger}
initial="hidden"
animate="show"
           
           
            transition={{ duration: 0.6 }}
            className="landing-tag mb-8"
          >
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brass opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brass"></span>
            </span>
            Next-Gen Civic Intelligence
          </motion.div>

          <motion.h1
variants={fadeUp}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-7xl md:text-8xl mb-8 font-display tracking-tighter leading-[0.9]"
          >
            Empowering Cities with <br />
            <span className="text-brass italic">Decision Intelligence</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl opacity-60 max-w-2xl mx-auto mb-12 font-medium leading-relaxed"
          >
            SCIP transforms community feedback into high-fidelity data. 
            Leveraging Google Gemini to automate triage, predict risks, 
            and optimize resource allocation in real-time.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6"
          >
            <button
              onClick={() => navigate('/login')}
              className="group
bg-gradient-to-r
from-blue-600
to-indigo-600
text-white
px-10
py-5
rounded-2xl
font-semibold
shadow-xl
hover:shadow-2xl
hover:scale-105
transition-all
duration-300
">
              Launch Platform <ArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </button>
            <button className="backdrop-blur-md bg-white/40 px-10 py-5 rounded-2xl font-bold text-lg border border-ink/10 hover:bg-white/60 transition-all">
              Enterprise Demo
            </button>
          </motion.div>
        </motion.div>

        {/* Animated Visual Element */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-t from-white to-transparent rounded-t-full border-t border-ink/5 pointer-events-none"
        />
      </section>

      {/* Statistics Section */}
      <section id="stats" className="py-20 bg-ink text-paper relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <StatItem label="Response Time" value="-45%" sub="AI-Automated Triage" />
          <StatItem label="Case Accuracy" value="99.2%" sub="Gemini Flash 1.5" />
          <StatItem label="Citizen Trust" value="4.8/5" sub="Verified Transparency" />
          <StatItem label="Deployments" value="12k+" sub="Resource Optimized" />
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-32 px-6 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mb-24 text-center">
            <h2 className="text-5xl font-display tracking-tight mb-4">A Modular Intelligence Loop</h2>
            <p className="opacity-60 text-lg">Four stages of automated governance powered by Google Cloud.</p>
          </motion.div>

          <motion.div 
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <StepCard step="01" title="Multimodal Intake" desc="Analyze images, voice, and text instantly with Gemini multimodal capabilities." />
            <StepCard step="02" title="Predictive Triage" desc="Automated department routing and priority scoring based on safety risk indices." />
            <StepCard step="03" title="Decision Logic" desc="AI agents provide ground teams with step-by-step action plans and resource needs." />
            <StepCard step="04" title="Public Accountability" desc="Transparent immutable tracking for every case-file from report to resolution." />
          </motion.div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="py-32 px-6 bg-paper/50 backdrop-blur-sm border-y border-ink/5">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div className="max-w-2xl">
              <h2 className="text-5xl font-display tracking-tight mb-6">Built for the Modern Municipality</h2>
              <p className="text-lg opacity-60">SCIP replaces archaic ticketing with an AI-first operating system designed for scale, security, and speed.</p>
            </div>
            <button className="landing-tag !mb-0 py-3 px-8 text-sm">View Full Documentation</button>
          </motion.div>
          
          <motion.div 
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Shield size={24} />}
              title="Enterprise Security"
              desc="JWT-based role management with Super Admin audit logging and secure session protocols."
            />
            <FeatureCard 
              icon={<Zap size={24} />}
              title="Priority Prediction"
              desc="Machine learning models that identify critical infrastructure failures before they escalate."
            />
            <FeatureCard 
              icon={<BarChart size={24} />}
              title="Executive Analytics"
              desc="Real-time Recharts dashboards visualizing community health, risk maps, and team load."
            />
            <FeatureCard 
              icon={<MessageSquare size={24} />}
              title="Gemini Chat Assistant"
              desc="Conversational interface for citizens to query data, resolution status, and filing help."
            />
            <FeatureCard 
              icon={<Globe size={24} />}
              title="GPS Geofencing"
              desc="Automated area detection and coordinate mapping for precise ground team deployment."
            />
          </motion.div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-display mb-16 opacity-40 uppercase tracking-widest font-bold">The Core Stack</h2>
          <motion.div 
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
            <TechItem name="Google Gemini" />
            <TechItem name="FastAPI" />
            <TechItem name="React Router v7" />
            <TechItem name="Vertex AI" />
            <TechItem name="BigQuery" />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-paper py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <BrainCircuit className="text-brass" size={24} />
                <span className="font-display font-bold text-2xl">SCIP</span>
              </div>
              <p className="opacity-60 max-w-sm mb-8">
                Building the future of community governance through 
                intelligent automation and Google Cloud's Generative AI.
              </p>
              <div className="flex gap-4">
              
                <SocialIcon icon={<Mail size={18} />} />
               
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6">Platform</h4>
              <ul className="space-y-4 opacity-60 text-sm">
                <li><button onClick={() => navigate('/citizen')} className="hover:text-brass">Citizen Portal</button></li>
                <li><button onClick={() => navigate('/admin')} className="hover:text-brass">Admin Terminal</button></li>
                <li><a href="#" className="hover:text-brass">Executive Reports</a></li>
                <li><a href="#" className="hover:text-brass">Risk Mapping</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6">Legal</h4>
              <ul className="space-y-4 opacity-60 text-sm">
                <li><a href="#" className="hover:text-brass">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-brass">Terms of Service</a></li>
                <li><a href="#" className="hover:text-brass">Security Protocol</a></li>
                <li><a href="#" className="hover:text-brass">Audit Standards</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-paper/10 flex flex-col md:flex-row justify-between gap-4 text-xs opacity-40 font-mono uppercase tracking-widest">
            <p>© 2025 Smart Community Intelligence Platform. All rights reserved.</p>
            <p>Powered by Gemini Flash 2.0 & Google ADK</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  sub: string;
}

function StatItem({ label, value, sub }: StatItemProps) {
  return (
    <div className="space-y-2">
      <div className="text-4xl md:text-5xl font-display font-bold text-brass">{value}</div>
      <div className="font-bold uppercase text-xs tracking-tighter">{label}</div>
      <div className="text-[10px] opacity-40 uppercase tracking-widest font-mono">{sub}</div>
    </div>
  );
}

interface StepCardProps {
  step: string;
  title: string;
  desc: string;
}

function StepCard({ step, title, desc }: StepCardProps) {
  return (
    <motion.div 
      variants={fadeUp}
      className="p-8 rounded-3xl bg-paper/50 border border-ink/5 hover:border-brass/20 transition-all group"
    >
      <div className="text-xs font-mono font-bold text-brass mb-6 tracking-widest">{step}</div>
      <h3 className="text-xl font-display font-semibold mb-4">{title}</h3>
      <p className="text-sm opacity-60 leading-relaxed font-medium">{desc}</p>
    </motion.div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

function FeatureCard({ icon, title, desc }: FeatureCardProps) {
  return (
    <motion.div 
      variants={fadeUp}
      whileHover={{ y: -5 }}
      className="p-8 rounded-[2rem] bg-white border border-ink/5 hover:shadow-2xl hover:shadow-ink/5 transition-all group"
    >
      <div className="mb-6 p-4 bg-brass-bg rounded-2xl w-fit text-brass group-hover:bg-ink group-hover:text-paper transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-display font-bold mb-3 tracking-tight">{title}</h3>
      <p className="text-sm opacity-60 leading-relaxed font-medium">{desc}</p>
    </motion.div>
  );
}
function TechItem({
  name,
}: {
  name: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{
        y: -6,
      }}
      className="
      bg-white
      rounded-2xl
      border
      border-slate-200
      shadow-sm
      hover:shadow-xl
      p-6
      text-center
      "
    >
      <span className="font-semibold">
        {name}
      </span>
    </motion.div>
  );
}

interface SocialIconProps {
  icon: React.ReactNode;
}

function SocialIcon({ icon }: SocialIconProps) {
  return (
    <div className="w-10 h-10 rounded-full border border-paper/10 flex items-center justify-center hover:bg-brass hover:border-brass transition-all cursor-pointer">
      {icon}
    </div>
  );
}