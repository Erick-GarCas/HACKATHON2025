/* SmartOps MVP - main logic
   Manages tasks with automated team assignment, live stats,
   filters, localStorage persistence, and dark mode support. */

const STORAGE_KEY = "smartops_tasks_v1";
const THEME_KEY = "smartops_theme";
const AUTO_INTERVAL_MS = 30_000;
const AUTO_TASK_TITLES = [
    "Revisar inventario",
    "Limpieza de área A",
    "Verificar temperatura",
    "Control de alimentos",
    "Chequeo de seguridad"
];

const STATUS = Object.freeze({
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed"
});

const TEAMS = ["Equipo A", "Equipo B", "Equipo C"];

const statusConfig = {
    [STATUS.PENDING]: { label: "Pendiente", badgeClass: "text-bg-warning text-dark" },
    [STATUS.IN_PROGRESS]: { label: "En curso", badgeClass: "text-bg-primary" },
    [STATUS.COMPLETED]: { label: "Completada", badgeClass: "text-bg-success" }
};

const elements = {
    form: document.querySelector("#taskForm"),
    input: document.querySelector("#taskName"),
    stats: {
        total: document.querySelector("#totalTasks"),
        pending: document.querySelector("#pendingTasks"),
        inProgress: document.querySelector("#inProgressTasks"),
        completed: document.querySelector("#completedTasks")
    },
    tasksContainer: document.querySelector("#tasksContainer"),
    emptyState: document.querySelector("#emptyState"),
    filter: document.querySelector("#statusFilter"),
    tasksCounterLabel: document.querySelector("#tasksCounterLabel"),
    darkModeToggle: document.querySelector("#darkModeToggle"),
    root: document.documentElement
};

let tasks = [];
let filterStatus = "all";
let automationTimerId = null;
let recentlyAddedTaskId = null;

init();

// Punto de entrada: prepara estado inicial, listeners y temporizadores.
function init() {
    loadThemePreference();
    tasks = loadTasksFromStorage();
    reconcileAssignments();
    renderTasks();
    updateStats();
    setupEventListeners();
    startAutomationLoop();
}

// Configura los eventos principales de la interfaz.
function setupEventListeners() {
    elements.form.addEventListener("submit", handleTaskFormSubmit);

    elements.tasksContainer.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action='complete']");
        if (!button) return;
        markTaskAsCompleted(button.dataset.id);
    });

    elements.filter.addEventListener("change", (event) => {
        filterStatus = event.target.value;
        renderTasks();
    });

    elements.darkModeToggle.addEventListener("change", (event) => {
        const theme = event.target.checked ? "dark" : "light";
        applyTheme(theme);
    });

    window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY) {
            tasks = loadTasksFromStorage();
            reconcileAssignments();
            renderTasks();
            updateStats();
        }
        if (event.key === THEME_KEY && event.newValue) {
            applyTheme(event.newValue);
        }
    });
}

// Maneja la creacion manual de tareas desde el formulario.
function handleTaskFormSubmit(event) {
    event.preventDefault();
    const title = elements.input.value.trim();

    if (!title) {
        elements.input.classList.add("is-invalid");
        elements.input.focus();
        return;
    }

    elements.input.classList.remove("is-invalid");
    createTask(title, "manual");
    elements.input.value = "";
    elements.input.focus();
}

// Crea una nueva tarea y la incorpora al flujo operativo.
function createTask(title, source = "manual") {
    const newTask = {
        id: generateTaskId(),
        title,
        status: STATUS.PENDING,
        assignedTeam: null,
        source,
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    assignTeamIfAvailable(newTask);
    tasks.unshift(newTask);
    recentlyAddedTaskId = newTask.id;
    persistAndRefresh();
    clearRecentHighlight(newTask.id);
}

// Intenta asignar el nuevo trabajo al primer equipo libre.
function assignTeamIfAvailable(task) {
    const availableTeam = getAvailableTeam();
    if (!availableTeam) return;
    task.assignedTeam = availableTeam;
    task.status = STATUS.IN_PROGRESS;
}

function getAvailableTeam() {
    for (const team of TEAMS) {
        const isBusy = tasks.some(
            (task) => task.assignedTeam === team && task.status === STATUS.IN_PROGRESS
        );
        if (!isBusy) return team;
    }
    return null;
}

// Actualiza el estado de la tarea y libera al equipo correspondiente.
function markTaskAsCompleted(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === STATUS.COMPLETED) return;

    task.status = STATUS.COMPLETED;
    task.completedAt = new Date().toISOString();
    assignPendingTasksToAvailableTeams();
    persistAndRefresh();
}

// Reasigna automaticamente tareas en espera a equipos que quedaron libres.
function assignPendingTasksToAvailableTeams() {
    for (const team of TEAMS) {
        if (!isTeamAvailable(team)) continue;
        const pendingTask = tasks
            .slice()
            .reverse()
            .find((task) => task.status === STATUS.PENDING);
        if (!pendingTask) continue;
        pendingTask.status = STATUS.IN_PROGRESS;
        pendingTask.assignedTeam = team;
    }
}

function isTeamAvailable(team) {
    return !tasks.some(
        (task) => task.assignedTeam === team && task.status === STATUS.IN_PROGRESS
    );
}

// Dibuja todas las tarjetas de tareas aplicando el filtro activo.
function renderTasks() {
    elements.tasksContainer.setAttribute("aria-busy", "true");
    elements.tasksContainer.innerHTML = "";

    const filteredTasks = tasks.filter((task) => {
        if (filterStatus === "all") return true;
        return task.status === filterStatus;
    });

    updateVisibleTasksLabel(filteredTasks.length);
    toggleEmptyState(filteredTasks.length === 0);

    const fragment = document.createDocumentFragment();
    for (const task of filteredTasks) {
        const column = document.createElement("div");
        column.className = "col fade-enter";
        column.appendChild(createTaskCard(task));
        fragment.appendChild(column);
    }

    elements.tasksContainer.appendChild(fragment);
    elements.tasksContainer.setAttribute("aria-busy", "false");
}

// Construye el componente visual para cada tarea.
function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = "card task-card h-100 shadow-sm border-0";
    card.dataset.id = task.id;
    if (task.id === recentlyAddedTaskId) {
        card.classList.add("task-card--highlight");
    }

    const status = statusConfig[task.status] ?? statusConfig[STATUS.PENDING];
    const createdDate = formatTimestamp(task.createdAt);
    const teamLabel = task.assignedTeam ?? "No asignado";

    card.innerHTML = `
        <div class="card-body d-flex flex-column gap-3">
            <div class="d-flex justify-content-between align-items-start gap-3">
                <div>
                    <h3 class="h5 fw-semibold mb-1">${escapeHTML(task.title)}</h3>
                    <p class="text-body-secondary small mb-0">
                        ${task.source === "auto" ? "Tarea automática" : "Creada manualmente"} &middot; ${createdDate}
                    </p>
                </div>
                <span class="badge ${status.badgeClass}">${status.label}</span>
            </div>
            <div class="d-flex flex-column gap-1 small">
                <div class="fw-medium text-body-secondary">Equipo asignado</div>
                <div class="fw-semibold">${escapeHTML(teamLabel)}</div>
            </div>
            <div class="mt-auto card-actions">
                <button
                    type="button"
                    class="btn btn-outline-success btn-sm flex-grow-1"
                    data-action="complete"
                    data-id="${task.id}"
                    ${task.status === STATUS.COMPLETED ? "disabled" : ""}>
                    ${task.status === STATUS.COMPLETED ? "Completada" : "Hecho ✅"}
                </button>
            </div>
        </div>
    `;

    return card;
}

// Recalcula los contadores de estado mostrados en la parte superior.
function updateStats() {
    const totals = {
        total: tasks.length,
        pending: tasks.filter((task) => task.status === STATUS.PENDING).length,
        inProgress: tasks.filter((task) => task.status === STATUS.IN_PROGRESS).length,
        completed: tasks.filter((task) => task.status === STATUS.COMPLETED).length
    };

    elements.stats.total.textContent = totals.total;
    elements.stats.pending.textContent = totals.pending;
    elements.stats.inProgress.textContent = totals.inProgress;
    elements.stats.completed.textContent = totals.completed;
}

// Ajusta la leyenda que resume cuantas tareas se muestran.
function updateVisibleTasksLabel(count) {
    const statusLabels = {
        all: "tareas visibles",
        [STATUS.PENDING]: "pendientes visibles",
        [STATUS.IN_PROGRESS]: "en curso visibles",
        [STATUS.COMPLETED]: "completadas visibles"
    };
    const label = statusLabels[filterStatus] ?? "tareas visibles";
    const suffix = count === 1 ? label.replace("visibles", "visible") : label;
    elements.tasksCounterLabel.textContent = `${count} ${suffix}`;
}

function toggleEmptyState(isEmpty) {
    elements.emptyState.style.display = isEmpty ? "block" : "none";
}

// Persiste los datos y vuelve a pintar la interfaz.
function persistAndRefresh() {
    saveTasksToStorage(tasks);
    updateStats();
    renderTasks();
}

// Recupera las tareas guardadas en el navegador de forma segura.
function loadTasksFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(normalizeTask)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        console.warn("No se pudieron cargar las tareas:", error);
        return [];
    }
}

// Corrige tareas restauradas para evitar valores inesperados.
function normalizeTask(rawTask) {
    return {
        id: rawTask.id ?? generateTaskId(),
        title: String(rawTask.title ?? "Tarea sin título"),
        status: Object.values(STATUS).includes(rawTask.status) ? rawTask.status : STATUS.PENDING,
        assignedTeam: rawTask.assignedTeam ?? null,
        source: rawTask.source === "auto" ? "auto" : "manual",
        createdAt: rawTask.createdAt ?? new Date().toISOString(),
        completedAt: rawTask.completedAt ?? null
    };
}

function saveTasksToStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Arranca el temporizador que genera tareas automaticas.
function startAutomationLoop() {
    if (automationTimerId) clearInterval(automationTimerId);
    automationTimerId = setInterval(createAutomaticTask, AUTO_INTERVAL_MS);
}

// Crea una tarea simulada y la incorpora al pipeline.
function createAutomaticTask() {
    const randomTitle =
        AUTO_TASK_TITLES[Math.floor(Math.random() * AUTO_TASK_TITLES.length)];
    createTask(`${randomTitle} (${generateSequenceSuffix()})`, "auto");
}

// Ajusta asignaciones al restaurar datos desde almacenamiento local.
function reconcileAssignments() {
    // Garantiza que las asignaciones sean consistentes al recargar la app.
    const assignedTeams = new Set();
    for (const task of tasks) {
        if (task.status === STATUS.IN_PROGRESS && task.assignedTeam) {
            assignedTeams.add(task.assignedTeam);
        } else if (task.status !== STATUS.IN_PROGRESS) {
            task.assignedTeam = task.status === STATUS.PENDING ? null : task.assignedTeam;
        }
    }

    for (const task of tasks) {
        if (task.status !== STATUS.PENDING) continue;
        const availableTeam = TEAMS.find((team) => !assignedTeams.has(team));
        if (!availableTeam) break;
        task.status = STATUS.IN_PROGRESS;
        task.assignedTeam = availableTeam;
        assignedTeams.add(availableTeam);
    }

    saveTasksToStorage(tasks);
}

// Formatea la fecha ISO a un texto amigable en espanol.
function formatTimestamp(isoString) {
    if (!isoString) return "Fecha desconocida";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "Fecha desconocida";

    return new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short"
    }).format(date);
}

// Genera un identificador unico y confiable para cada tarea.
function generateTaskId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `task-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function generateSequenceSuffix() {
    const randomNumber = Math.floor(Math.random() * 900 + 100);
    return `#${randomNumber}`;
}

// Limpia el efecto visual de realce despues de un breve lapso.
function clearRecentHighlight(taskId) {
    setTimeout(() => {
        if (recentlyAddedTaskId === taskId) {
            recentlyAddedTaskId = null;
        }
    }, 2000);
}

function escapeHTML(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Restaura la preferencia de tema desde localStorage.
function loadThemePreference() {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === "dark") {
        elements.darkModeToggle.checked = true;
        applyTheme("dark", false);
    } else {
        applyTheme("light", false);
    }
}

// Cambia el modo claro/oscuro y persiste la preferencia.
function applyTheme(theme, persist = true) {
    const normalizedTheme = theme === "dark" ? "dark" : "light";
    document.body.setAttribute("data-bs-theme", normalizedTheme);
    elements.darkModeToggle.checked = normalizedTheme === "dark";
    if (persist) {
        localStorage.setItem(THEME_KEY, normalizedTheme);
    }
}
