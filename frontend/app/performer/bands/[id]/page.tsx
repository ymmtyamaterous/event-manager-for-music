"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APIUser,
  createSetlist,
  listBandMembers,
  listMyBands,
  listSetlists,
  replaceBandMembers,
  resolveAssetUrl,
  updateBand,
  uploadBandProfileImage,
  deleteSetlist,
} from "@/lib/api";
import { Band, BandMember, Setlist } from "@/types";

type BandEditPageProps = {
  params: Promise<{ id: string }>;
};

export default function PerformerBandEditPage({ params }: BandEditPageProps) {
  const [bandId, setBandId] = useState("");
  const [band, setBand] = useState<Band | null>(null);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [formedYear, setFormedYear] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPart, setNewMemberPart] = useState("");
  const [newSetlistTitle, setNewSetlistTitle] = useState("");
  const [newSetlistArtist, setNewSetlistArtist] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const accessToken = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return localStorage.getItem("access_token") ?? "";
  }, []);

  const user = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const raw = localStorage.getItem("user");
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as APIUser;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const loadParams = async () => {
      const resolved = await params;
      setBandId(resolved.id);
    };
    void loadParams();
  }, [params]);

  const loadAll = useCallback(async () => {
    if (!bandId || !accessToken) {
      return;
    }
    const [bands, memberRows, setlistRows] = await Promise.all([
      listMyBands(accessToken),
      listBandMembers(bandId, accessToken),
      listSetlists(bandId, accessToken),
    ]);
    const target = (bands ?? []).find((item) => item.id === bandId) ?? null;
    setBand(target);
    setMembers(memberRows ?? []);
    setSetlists(setlistRows ?? []);

    if (target) {
      setName(target.name);
      setGenre(target.genre ?? "");
      setDescription(target.description ?? "");
      setFormedYear(target.formedYear?.toString() ?? "");
      setTwitterUrl(target.twitterUrl ?? "");
    }
  }, [bandId, accessToken]);

  useEffect(() => {
    const load = async () => {
      if (!bandId) {
        return;
      }
      if (!accessToken || !user) {
        window.location.href = "/login";
        return;
      }
      if (user.user_type !== "performer") {
        window.location.href = "/";
        return;
      }

      setError("");
      setIsLoading(true);
      try {
        await loadAll();
      } catch (err) {
        setError(err instanceof Error ? err.message : "バンド情報の取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [bandId, accessToken, user, loadAll]);

  const handleSaveBand = async () => {
    if (!accessToken || !bandId) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      await updateBand(bandId, accessToken, {
        name,
        genre,
        description,
        formedYear: formedYear ? Number(formedYear) : undefined,
        twitterUrl,
      });
      await loadAll();
      setSuccess("バンド情報を更新しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "バンド情報の更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadBandImage = async (file: File | null) => {
    if (!file || !accessToken || !bandId) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      await uploadBandProfileImage(bandId, accessToken, file);
      await loadAll();
      setSuccess("バンド画像を更新しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "バンド画像の更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberPart.trim() || !accessToken || !bandId) {
      return;
    }

    const next = [
      ...members,
      {
        id: "tmp",
        bandId,
        name: newMemberName.trim(),
        part: newMemberPart.trim(),
        displayOrder: members.length + 1,
        createdAt: "",
        updatedAt: "",
      },
    ];

    setIsSaving(true);
    setError("");
    try {
      const updated = await replaceBandMembers(
        bandId,
        accessToken,
        next.map((m, index) => ({
          name: m.name,
          part: m.part,
          displayOrder: index + 1,
        })),
      );
      setMembers(updated);
      setNewMemberName("");
      setNewMemberPart("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "メンバー追加に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!accessToken || !bandId) {
      return;
    }

    const filtered = members.filter((m) => m.id !== memberId);
    setIsSaving(true);
    setError("");
    try {
      const updated = await replaceBandMembers(
        bandId,
        accessToken,
        filtered.map((m, index) => ({
          name: m.name,
          part: m.part,
          displayOrder: index + 1,
        })),
      );
      setMembers(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "メンバー削除に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSetlist = async () => {
    if (!accessToken || !bandId || !newSetlistTitle.trim()) {
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await createSetlist(bandId, accessToken, {
        title: newSetlistTitle.trim(),
        artist: newSetlistArtist.trim() || undefined,
      });
      const rows = await listSetlists(bandId, accessToken);
      setSetlists(rows);
      setNewSetlistTitle("");
      setNewSetlistArtist("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "セットリスト追加に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSetlist = async (setlistId: string) => {
    if (!accessToken || !bandId) {
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await deleteSetlist(bandId, setlistId, accessToken);
      const rows = await listSetlists(bandId, accessToken);
      setSetlists(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "セットリスト削除に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-600">読み込み中...</p>;
  }

  if (!band) {
    return <p className="text-sm text-gray-600">バンドが見つかりません。</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">バンド編集</h1>
        <p className="mt-1 text-sm text-gray-600">基本情報・メンバー・セットリストを管理できます。</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-gray-900">基本情報</h2>
        <div className="h-28 w-28 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
          {band.profileImagePath ? (
            <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${resolveAssetUrl(band.profileImagePath)})` }} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">未設定</div>
          )}
        </div>
        <input type="file" accept="image/*" onChange={(e) => handleUploadBandImage(e.target.files?.[0] ?? null)} className="text-sm" />
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="バンド名" />
        <input value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="ジャンル" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-24 border rounded-lg px-3 py-2" placeholder="説明" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={formedYear} onChange={(e) => setFormedYear(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="結成年" />
          <input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Twitter URL" />
        </div>
        <button disabled={isSaving} onClick={handleSaveBand} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70">
          保存
        </button>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-gray-900">メンバー</h2>
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
            <p className="text-sm text-gray-800">{member.name} / {member.part}</p>
            <button onClick={() => handleDeleteMember(member.id)} className="text-sm text-red-600">削除</button>
          </div>
        ))}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="border rounded-lg px-3 py-2" placeholder="名前" />
          <input value={newMemberPart} onChange={(e) => setNewMemberPart(e.target.value)} className="border rounded-lg px-3 py-2" placeholder="担当" />
          <button onClick={handleAddMember} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">追加</button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-gray-900">セットリスト</h2>
        {setlists.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
            <p className="text-sm text-gray-800">{item.title}{item.artist ? ` / ${item.artist}` : ""}</p>
            <button onClick={() => handleDeleteSetlist(item.id)} className="text-sm text-red-600">削除</button>
          </div>
        ))}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input value={newSetlistTitle} onChange={(e) => setNewSetlistTitle(e.target.value)} className="border rounded-lg px-3 py-2" placeholder="曲名" />
          <input value={newSetlistArtist} onChange={(e) => setNewSetlistArtist(e.target.value)} className="border rounded-lg px-3 py-2" placeholder="アーティスト" />
          <button onClick={handleAddSetlist} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">追加</button>
        </div>
      </section>
    </div>
  );
}
