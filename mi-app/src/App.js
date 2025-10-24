import './App.css';

// Datos simulados que alimentan las tarjetas de metricas superiores
const metrics = [
  { title: 'Ingresos', value: '$24,500', delta: '+12.4%' },
  { title: 'Clientes nuevos', value: '53', delta: '+8.1%' },
  { title: 'Tickets abiertos', value: '18', delta: '-3.2%' },
];

// Valores para dibujar las barras del "grafico" semanal
const activity = [
  { label: 'Lun', value: 40 },
  { label: 'Mar', value: 55 },
  { label: 'Mie', value: 32 },
  { label: 'Jue', value: 67 },
  { label: 'Vie', value: 52 },
  { label: 'Sab', value: 38 },
  { label: 'Dom', value: 44 },
];

// Lista de tareas con el estado actual de cada una
const tasks = [
  { title: 'Enviar reporte semanal', status: 'En progreso' },
  { title: 'Revisar feedback de clientes', status: 'Pendiente' },
  { title: 'Actualizar inventario', status: 'Completado' },
  { title: 'Planificar campana de marketing', status: 'Pendiente' },
];

function App() {
  return (
    <div className="dashboard">
      {/* Barra lateral con marca y menu de navegacion */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">MD</div>
          <div>
            <h2>Mi Dashboard</h2>
            <p>Control central</p>
          </div>
        </div>

        <nav className="menu">
          <button className="menu-item active">Vision general</button>
          <button className="menu-item">Ventas</button>
          <button className="menu-item">Clientes</button>
          <button className="menu-item">Configuracion</button>
        </nav>
      </aside>

      <main className="main">
        {/* Encabezado principal con bienvenida y usuario activo */}
        <header className="main-header">
          <div>
            <h1>Panel general</h1>
            <p>Resumen de metricas clave y actividad de la semana</p>
          </div>
          <div className="user-pill">
            <div className="avatar">AE</div>
            <span>Ana Estratega</span>
          </div>
        </header>

        {/* Tarjetas de resumen (map recorre el arreglo metrics) */}
        <section className="metrics">
          {metrics.map((metric) => (
            <article key={metric.title} className="metric-card">
              <h3>{metric.title}</h3>
              <strong>{metric.value}</strong>
              <span className={metric.delta.startsWith('+') ? 'delta up' : 'delta down'}>
                {metric.delta} vs. semana anterior
              </span>
            </article>
          ))}
        </section>

        <section className="grid">
          {/* Tarjeta con barras verticales formadas via CSS inline */}
          <article className="card chart-card">
            <header>
              <h3>Actividad semanal</h3>
              <span className="tag">vista rapida</span>
            </header>
            <div className="chart">
              {activity.map((item) => (
                <div key={item.label} className="bar">
                  <div className="bar-fill" style={{ height: `${item.value}%` }} />
                  <span className="bar-label">{item.label}</span>
                </div>
              ))}
            </div>
          </article>

          {/* Lista de tareas con su estado y boton de accion */}
          <article className="card">
            <header>
              <h3>Tareas del equipo</h3>
              <button className="link-button" type="button">
                Ver todas
              </button>
            </header>
            <ul className="task-list">
              {tasks.map((task) => (
                <li key={task.title}>
                  <div>
                    <h4>{task.title}</h4>
                    <span className={`status ${task.status === 'Completado' ? 'done' : ''}`}>
                      {task.status}
                    </span>
                  </div>
                  <button className="secondary-button" type="button">
                    Detalles
                  </button>
                </li>
              ))}
            </ul>
          </article>

          {/* Panel de notas rapidas para recordatorios del equipo */}
          <article className="card announcements">
            <header>
              <h3>Notas rapidas</h3>
            </header>
            <p>
              Usa este espacio para compartir avisos con tu equipo, registrar ideas o anotar
              recordatorios importantes.
            </p>
            <ul>
              <li>Lanzamiento de la version 2.1 el viernes</li>
              <li>Reunion con socios estrategicos el martes 10:00</li>
              <li>Investigar nuevas herramientas de automatizacion</li>
            </ul>
            <button className="primary-button" type="button">
              Crear nota
            </button>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
