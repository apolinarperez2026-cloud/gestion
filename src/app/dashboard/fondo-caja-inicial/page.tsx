"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthUser } from "@/types/database";
import SuccessModal from "@/components/SuccessModal";
import NotificationModal from "@/components/NotificationModal";
import { displayDateOnly } from "@/lib/dateUtils";

interface FondoCajaInicial {
  id: number;
  monto: number;
  fecha: string;
  sucursal: {
    id: number;
    nombre: string;
  };
  usuario?: {
    id: number;
    nombre: string;
    rol: {
      nombre: string;
    };
  };
  createdAt: string;
}

export default function FondoCajaInicialPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fondosCajaInicial, setFondosCajaInicial] = useState<
    FondoCajaInicial[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    monto: "",
    fecha: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingFondo, setEditingFondo] = useState<FondoCajaInicial | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fondoToDelete, setFondoToDelete] = useState<FondoCajaInicial | null>(
    null,
  );
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  const [stats, setStats] = useState({
    totalMonto: 0,
    countFondos: 0,
  });
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        router.push("/auth/login");
      }
    } catch (error) {
      router.push("/auth/login");
    }
  };

  // Función para calcular estadísticas
  // BUG-13 FIX: mostrar el monto del último registro del mes, no la suma acumulada
  // El fondo de caja inicial es un valor puntual, no acumulativo
  const calculateStats = (fondos: FondoCajaInicial[]) => {
    const fondosOrdenados = [...fondos].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );
    const ultimoMonto =
      fondosOrdenados.length > 0 ? fondosOrdenados[0].monto : 0;

    setStats({
      totalMonto: ultimoMonto,
      countFondos: fondos.length,
    });
  };

  const fetchFondosCajaInicial = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/fondo-caja-inicial?month=${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setFondosCajaInicial(data.fondosCajaInicial || []);
        calculateStats(data.fondosCajaInicial || []);
      } else if (response.status === 401) {
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Error al obtener fondos de caja iniciales:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchFondosCajaInicial();
  }, [selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/fondo-caja-inicial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({
          monto: "",
          fecha: new Date().toISOString().split("T")[0],
        });
        setShowForm(false);
        fetchFondosCajaInicial();
        setShowSuccessModal(true);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || "Error al crear fondo de caja inicial");
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error("Error al crear fondo de caja inicial:", error);
      setErrorMessage("Error al crear fondo de caja inicial");
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "monto") {
      // Solo permitir números, punto decimal y cadena vacía
      const numericValue = value.replace(/[^0-9.]/g, "");
      // Evitar múltiples puntos decimales
      const parts = numericValue.split(".");
      const validValue =
        parts.length > 2
          ? parts[0] + "." + parts.slice(1).join("")
          : numericValue;

      setFormData((prev) => ({
        ...prev,
        [name]: validValue === "" ? "" : validValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Solo permitir números, punto decimal, backspace, delete, tab, escape, enter
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ];
    const isNumber = /[0-9]/.test(e.key);
    const isDecimal = e.key === ".";
    const isAllowedKey = allowedKeys.includes(e.key);

    if (!isNumber && !isDecimal && !isAllowedKey) {
      e.preventDefault();
    }

    // Evitar múltiples puntos decimales
    if (isDecimal && (e.target as HTMLInputElement).value.includes(".")) {
      e.preventDefault();
    }
  };

  const handleEdit = (fondo: FondoCajaInicial) => {
    setEditingFondo(fondo);
    setIsEditing(true);
    setFormData({
      monto: fondo.monto.toString(),
      fecha: new Date(fondo.fecha).toISOString().split("T")[0],
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFondo) return;

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/fondo-caja-inicial/${editingFondo.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            monto: parseFloat(formData.monto),
            fecha: formData.fecha,
          }),
        },
      );

      if (response.ok) {
        setFormData({
          monto: "",
          fecha: new Date().toISOString().split("T")[0],
        });
        setShowForm(false);
        setIsEditing(false);
        setEditingFondo(null);
        fetchFondosCajaInicial();
        setShowSuccessModal(true);
      } else {
        const error = await response.json();
        setErrorMessage(
          error.error || "Error al actualizar fondo de caja inicial",
        );
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error("Error al actualizar fondo:", error);
      setErrorMessage("Error al actualizar fondo de caja inicial");
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingFondo(null);
    setFormData({
      monto: "",
      fecha: new Date().toISOString().split("T")[0],
    });
    setShowForm(false);
  };

  const handleDelete = (fondo: FondoCajaInicial) => {
    setFondoToDelete(fondo);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!fondoToDelete) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `/api/fondo-caja-inicial/${fondoToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        fetchFondosCajaInicial();
        setShowDeleteModal(false);
        setFondoToDelete(null);
        setShowSuccessModal(true);
      } else {
        const error = await response.json();
        setErrorMessage(
          error.error || "Error al eliminar fondo de caja inicial",
        );
        setShowErrorModal(true);
        setShowDeleteModal(false);
        setFondoToDelete(null);
      }
    } catch (error) {
      console.error("Error al eliminar fondo:", error);
      setErrorMessage("Error al eliminar fondo de caja inicial");
      setShowErrorModal(true);
      setShowDeleteModal(false);
      setFondoToDelete(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Volver al Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.sucursal ? user.sucursal.nombre : "Libro Diario"}
                </h1>
                <p className="text-sm text-gray-600">Fondo de Caja Inicial</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.nombre}
                </p>
                <p className="text-xs text-gray-500">{user.rol.nombre}</p>
              </div>
              <button onClick={handleLogout} className="text-sm btn-secondary">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Controles superiores */}
        <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Mes y Año
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                }}
                className="input-field"
              />
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="mt-6 btn-primary h-fit"
            >
              {showForm ? "Cancelar" : "Nuevo Fondo de Caja Inicial"}
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2">
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Último monto registrado
                </p>
                <p className="text-2xl font-semibold text-green-600">
                  ${stats.totalMonto.toLocaleString("en-US")}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Cantidad de Fondos
                </p>
                <p className="text-2xl font-semibold text-blue-600">
                  {stats.countFondos}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario para nuevo fondo inicial */}
        {showForm && (
          <div className="mb-8 card">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {isEditing
                ? "Editar Fondo de Caja Inicial"
                : "Nuevo Fondo de Caja Inicial"}
            </h2>
            <form
              onSubmit={isEditing ? handleUpdate : handleSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Monto Inicial *
                  </label>
                  <input
                    type="text"
                    name="monto"
                    value={formData.monto === "" ? "" : formData.monto}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={
                    isEditing ? handleCancelEdit : () => setShowForm(false)
                  }
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? isEditing
                      ? "Actualizando..."
                      : "Guardando..."
                    : isEditing
                      ? "Actualizar Fondo"
                      : "Guardar Fondo Inicial"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de fondos iniciales */}
        <div className="card">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Fondos de Caja Iniciales Registrados
          </h2>

          {fondosCajaInicial.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No hay fondos de caja iniciales registrados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Registrado por
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Fecha de Registro
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fondosCajaInicial.map((fondo) => (
                    <tr key={fondo.id}>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {displayDateOnly(fondo.fecha)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600 whitespace-nowrap">
                        ${fondo.monto.toLocaleString("en-US")}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {fondo.usuario ? (
                          <div>
                            <div className="font-medium">
                              {fondo.usuario.nombre}
                            </div>
                            <div className="text-xs text-gray-500">
                              {fondo.usuario.rol.nombre}
                            </div>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {displayDateOnly(fondo.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(fondo)}
                            className="font-medium text-blue-600 hover:text-blue-900"
                          >
                            Editar
                          </button>
                          {user.rol.nombre === "Administrador" && (
                            <button
                              onClick={() => handleDelete(fondo)}
                              className="font-medium text-red-600 hover:text-red-900"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de éxito */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={
          isEditing
            ? "¡Fondo Inicial Actualizado!"
            : "¡Fondo Inicial Eliminado!"
        }
        message={
          isEditing
            ? "El fondo de caja inicial se ha actualizado exitosamente."
            : "El fondo de caja inicial se ha eliminado exitosamente."
        }
      />

      {/* Modal de error */}
      <NotificationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title="Error"
        message={errorMessage}
      />

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && fondoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-sm p-6 mx-4 bg-white rounded-lg">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Confirmar Eliminación
            </h3>
            <p className="mb-6 text-sm text-gray-600">
              ¿Estás seguro que deseas eliminar el fondo de caja inicial de $
              {fondoToDelete.monto.toLocaleString("en-US")} del{" "}
              {displayDateOnly(fondoToDelete.fecha)}? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setFondoToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white transition-colors bg-red-600 rounded-md hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
