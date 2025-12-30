import Link from 'next/link'
import { ArrowRight, Clock, Star, TrendingUp, DollarSign, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] text-white font-sans selection:bg-[#667eea] selection:text-white">

      {/* NAVBAR */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⏱️</span>
          <span className="font-bold text-xl tracking-tight">TimeKeeper</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm text-gray-300 font-medium">
          <a href="#features" className="hover:text-white transition">Funcionalidades</a>
          <a href="#pricing" className="hover:text-white transition">Precios</a>
          <a href="#about" className="hover:text-white transition">Nosotros</a>
        </div>
        <div>
          <Link href="/login" className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition border border-white/10">
            Entrar
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative px-6 py-20 md:py-32 max-w-7xl mx-auto text-center overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#667eea]/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>

        <div className="inline-flex items-center gap-2 bg-[#667eea]/10 border border-[#667eea]/20 text-[#667eea] px-4 py-1.5 rounded-full text-sm font-medium mb-8 animate-fade-in-up">
          <Star className="w-4 h-4 fill-current" />
          <span>La herramienta #1 para reuniones efectivas</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight animate-fade-in-up delay-100">
          Deja de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff4d4d] to-[#f9cb28]">quemar dinero</span> <br />
          en reuniones eternas.
        </h1>

        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
          TimeKeeper visualiza el costo real de tu tiempo, controla a los oradores y genera reportes de ROI automático. Haz que cada minuto cuente.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
          <Link href="/new" className="px-8 py-4 bg-[#667eea] hover:bg-[#5a6fd6] text-white rounded-full font-bold text-lg shadow-lg shadow-[#667eea]/25 transition hover:scale-105 flex items-center gap-2">
            Crear Reunión Gratis <ArrowRight className="w-5 h-5" />
          </Link>
          <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-full font-bold text-lg border border-white/10 transition">
            Ver Demo en Vivo
          </button>
        </div>

        {/* MOCKUP / PREVIEW */}
        <div className="mt-20 relative animate-fade-in-up delay-500">
          <img
            src="https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2674&q=80"
            alt="Dashboard Preview"
            className="rounded-3xl border border-white/10 shadow-2xl mx-auto max-w-5xl"
          />
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24 bg-black/20" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Todo lo que necesitas para <br /> auditar tus reuniones</h2>
            <p className="text-gray-400">Control total antes, durante y después de la sesión.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:border-white/10 transition group">
              <div className="bg-blue-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Semáforo de Tiempo</h3>
              <p className="text-gray-400 leading-relaxed">
                Evita que un solo orador secuestre la reunión. Alertas visuales (Verde, Amarillo, Rojo) y sonoras para mantener el ritmo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:border-white/10 transition group">
              <div className="bg-green-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition">
                <DollarSign className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Calculadora de Costos</h3>
              <p className="text-gray-400 leading-relaxed">
                Visualiza cuánto cuesta realmente juntar a 10 personas por una hora. Calcula el ROI esperado y elimina reuniones inútiles.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/5 hover:border-white/10 transition group">
              <div className="bg-purple-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Invitaciones Inteligentes</h3>
              <p className="text-gray-400 leading-relaxed">
                Envía enlaces únicos a oradores y admin. Integración automática de correo para que nadie llegue tarde ni sin contexto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 text-center px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-3xl p-12 md:p-20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>

          <h2 className="text-3xl md:text-5xl font-bold mb-6 relative z-10">¿Listo para recuperar tu tiempo?</h2>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto relative z-10">
            Únete a los equipos ágiles que ya están usando MeetKeeper para hacer sus reuniones más cortas y productivas.
          </p>
          <Link href="/new" className="px-10 py-5 bg-white text-[#667eea] hover:bg-gray-100 rounded-full font-bold text-xl shadow-xl transition relative z-10 inline-block">
            Empezar Ahora - Es Gratis
          </Link>
          <p className="mt-6 text-sm text-white/60 relative z-10 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" /> No requiere tarjeta de crédito
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} TimeKeeper. Todos los derechos reservados.</p>
      </footer>

    </div>
  )
}
