"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Upload, User, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PersonalModel } from "@/types/database";

export default function ModelsPage() {
  const [models, setModels] = useState<PersonalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      setModels(data.models || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setShowCreate(false);
        await fetchModels();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить персону и все фото?")) return;
    await fetch(`/api/models/${id}`, { method: "DELETE" });
    await fetchModels();
  }

  async function handleUpload(modelId: string, files: FileList) {
    setUploadingId(modelId);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("photos", file));

      await fetch(`/api/models/${modelId}`, {
        method: "POST",
        body: formData,
      });
      await fetchModels();
    } finally {
      setUploadingId(null);
    }
  }

  function getPhotoUrls(model: PersonalModel): string[] {
    if (!model.training_images?.length) return [];
    // Construct public URLs from storage paths
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return model.training_images.map(
      (path) => `${supabaseUrl}/storage/v1/object/public/training-images/${path}`
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Мои модели</h1>
          <p className="text-sm text-slate-500 mt-1">
            {models.length} / 10 моделей
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={models.length >= 10}>
          <Plus className="h-4 w-4" />
          Создать модель
        </Button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Имя персоны (например, Руслан)"
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none"
                autoFocus
              />
              <Button onClick={handleCreate} loading={creating} disabled={!newName.trim()}>
                Создать
              </Button>
              <Button variant="ghost" onClick={() => { setShowCreate(false); setNewName(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Создайте AI-персону, загрузите фото — и генерируйте изображения с сохранением лица
            </p>
          </CardContent>
        </Card>
      )}

      {models.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
          <div className="h-16 w-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Нет моделей</h3>
          <p className="text-sm text-slate-500 mb-4 text-center max-w-sm">
            Создайте AI-персону с набором фото для точной генерации контента
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Создать первую модель
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {models.map((model) => {
            const photoUrls = getPhotoUrls(model);
            return (
              <Card key={model.id} className="overflow-hidden">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="h-12 w-12 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
                        {photoUrls[0] ? (
                          <img
                            src={photoUrls[0]}
                            alt={model.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">{model.name}</h3>
                        <p className="text-xs text-slate-500">
                          {model.training_images_count || 0} фото
                          {model.status === "ready" && (
                            <span className="ml-2 text-emerald-400">● Готова</span>
                          )}
                          {model.status === "uploading" && (
                            <span className="ml-2 text-amber-400">● Загрузите фото</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(model.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Photo grid */}
                  {photoUrls.length > 0 && (
                    <div className="grid grid-cols-5 gap-1.5 mb-3">
                      {photoUrls.slice(0, 5).map((url, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden bg-white/[0.04]">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                      {photoUrls.length > 5 && (
                        <div className="aspect-square rounded-lg bg-white/[0.04] flex items-center justify-center">
                          <span className="text-xs text-slate-400">+{photoUrls.length - 5}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload button */}
                  <input
                    ref={uploadingId === model.id ? fileInputRef : undefined}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleUpload(model.id, e.target.files);
                      }
                    }}
                    id={`upload-${model.id}`}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    loading={uploadingId === model.id}
                    onClick={() => {
                      const input = document.getElementById(`upload-${model.id}`) as HTMLInputElement;
                      input?.click();
                    }}
                  >
                    {uploadingId === model.id ? (
                      "Загрузка..."
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Загрузить фото
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help */}
      <Card className="mt-6">
        <CardContent className="py-4">
          <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-amber-400" />
            Как это работает
          </h3>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li>1. Создайте модель и загрузите 3-10 фото лица (разные ракурсы, освещение)</li>
            <li>2. При генерации выберите модель Nano Banana Pro</li>
            <li>3. Выберите вашу персону — фото подставятся автоматически</li>
            <li>4. Опишите сцену в промпте — лицо будет сохранено</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
