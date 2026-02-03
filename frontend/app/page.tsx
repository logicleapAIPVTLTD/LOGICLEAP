"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Layers, Zap, Database, Cpu, LineChart, Shield, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const features = [
    { icon: Layers, title: "Deep Context Analysis", desc: "Computer vision detects rooms, dimensions, and materials instantly." },
    { icon: Zap, title: "Autonomous WBS", desc: "Generates 5-stage execution plans optimized for your specific city tier." },
    // { icon: Database, title: "Local-First Persistence", desc: "Your sensitive project data stays in your browser via IndexedDB." },
    // { icon: Cpu, title: "AI-Powered Estimation", desc: "Machine learning models trained on 10,000+ construction projects." },
    // { icon: LineChart, title: "Real-time Analytics", desc: "Live cost tracking and variance analysis with predictive insights." },
    // { icon: Shield, title: "Enterprise Security", desc: "Bank-grade encryption and compliance with ISO 27001 standards." },
  ];

  const stats = [
    { label: "Projects Analyzed", value: "50K+" },
    { label: "Accuracy Rate", value: "98.5%" },
    { label: "Time Saved", value: "80%" },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_80%_80%,rgba(59,130,246,0.2),rgba(255,255,255,0))]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          LogicLeap
        </h1>
        <Link href="/dashboard">
          <button className="px-6 py-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-sm font-medium">
            Get Started
          </button>
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">The Future of Construction Estimation is Here</span>
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-center mb-12"
        >
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-8 leading-tight">
            <span className="block">Transform</span>
            <span className="block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                PDFs into Profit
              </span>
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed font-light">
            The autonomous construction estimation engine powered by AI. Turn blueprints into detailed BOQs, WBS, BOM, and cost analysis in seconds and not weeks.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Link href="/dashboard">
              <button className="group relative px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-bold rounded-full text-lg transition-all flex items-center gap-3 shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)]">
                <span>Launch Engine</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <button className="px-10 py-5 bg-white/10 hover:bg-white/20 border border-white/20 font-bold rounded-full text-lg transition-all backdrop-blur-sm">
              Try It!
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 pt-12 border-t border-white/10">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  {/* {stat.value} */}
                </div>
                {/* <p className="text-gray-400 text-sm">{stat.label}</p> */}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Feature Grid */}
        {/* <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-32"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="group p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-indigo-500/30 hover:from-indigo-500/10 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center mb-6 group-hover:from-indigo-500/50 group-hover:to-purple-500/50 transition-all">
                <f.icon className="w-6 h-6 text-indigo-300 group-hover:text-indigo-200" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white group-hover:text-indigo-200 transition-colors">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div> */}

        {/* CTA Footer */}
        {/* <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-32 p-12 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 backdrop-blur-sm"
        >
          <h2 className="text-4xl font-bold mb-6">Ready to revolutionize your estimation process?</h2>
          <Link href="/dashboard">
            <button className="px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 font-bold rounded-full text-lg transition-all shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:shadow-[0_0_60px_rgba(99,102,241,0.6)]">
              Start Free Trial
            </button>
          </Link>
        </motion.div> */}
      </main>
    </div>
  );
}


