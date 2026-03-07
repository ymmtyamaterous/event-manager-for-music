"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { useAuth } from "@/lib/useAuth";
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
  const bandImageInputRef = useRef<HTMLInputElement>(null);

  const { accessToken, user, isReady } = useAuth();

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
      if (!isReady) return;
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
  }, [bandId, isReady, accessToken, user, loadAll]);

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
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">読み込み中...</p>;
  }

  if (!band) {
    return <p className="font-(family-name:--font-space-mono) text-xs text-[#6b6a75]">バンドが見つかりません。</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-(family-name:--font-bebas-neue) text-4xl tracking-wider text-[#f0eff5]">バンド編集</h1>
        <p className="mt-1 text-sm text-[#6b6a75]">基本情報・メンバー・セットリストを管理できます。</p>
      </div>

      {error && <div className="border border-[rgba(255,45,85,0.2)] bg-[rgba(255,45,85,0.08)] px-4 py-3 text-sm text-[#ff5470]">{error}</div>}
      {success && <div className="border border-[rgba(0,220,120,0.2)] bg-[rgba(0,220,120,0.08)] px-4 py-3 text-sm text-[#00dc78]">{success}</div>}

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6 space-y-4">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">基本情報</h2>
        <div className="h-28 w-28 overflow-hidden rounded-full border border-[rgba(255,255,255,0.12)] bg-[#060608]">
          {band.profileImagePath ? (
            <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${resolveAssetUrl(band.profileImagePath)})` }} />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-(family-name:--font-space-mono) text-[10px] text-[#6b6a75]">未設定</div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input ref={bandImageInputRef} type="file" accept="image/*" onChange={(e) => handleUploadBandImage(e.target.files?.[0] ?? null)} className="hidden" />
          <button
            type="button"
            onClick={() => bandImageInputRef.current?.click()}
            className="inline-flex items-center gap-2 border border-[rgba(255,255,255,0.12)] px-4 py-2 text-sm font-(family-name:--font-space-mono) tracking-[1px] text-[#f0eff5] hover:border-[rgba(255,255,255,0.25)] hover:bg-white/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#6b6a75]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            画像を変更
          </button>
          <span className="font-(family-name:--font-space-mono) text-[10px] text-[#6b6a75]">選択後すぐに反映されます</span>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors" placeholder="バンド名" />
        <input value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors" placeholder="ジャンル" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-24 bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors" placeholder="説明" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={formedYear} onChange={(e) => setFormedYear(e.target.value)} className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors" placeholder="結成年" />
          <input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} className="w-full bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors" placeholder="Twitter URL" />
        </div>
        <button disabled={isSaving} onClick={handleSaveBand} className="bg-[#ff2d55] hover:bg-[#ff5470] disabled:opacity-60 text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-3 px-6 transition-colors">
          保存
        </button>
      </section>

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6 space-y-4">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">メンバー</h2>
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between border border-[rgba(255,255,255,0.08)] px-3 py-2">
            <p className="text-sm text-[#f0eff5]">{member.name} / {member.part}</p>
            <button onClick={() => handleDeleteMember(member.id)} className="font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#ff5470] hover:text-[#ff2d55] transition-colors">削除</button>
          </div>
        ))}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors" placeholder="名前" />
          <input value={newMemberPart} onChange={(e) => setNewMemberPart(e.target.value)} className="bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors" placeholder="担当" />
          <button onClick={handleAddMember} className="bg-[#ff2d55] hover:bg-[#ff5470] text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2 px-4 transition-colors">追加</button>
        </div>
      </section>

      <section className="border border-[rgba(255,255,255,0.08)] bg-[#0d0d12] p-6 space-y-4">
        <h2 className="font-(family-name:--font-space-mono) text-xs tracking-[3px] text-[#6b6a75] uppercase">セットリスト</h2>
        {setlists.map((item) => (
          <div key={item.id} className="flex items-center justify-between border border-[rgba(255,255,255,0.08)] px-3 py-2">
            <p className="text-sm text-[#f0eff5]">{item.title}{item.artist ? ` / ${item.artist}` : ""}</p>
            <button onClick={() => handleDeleteSetlist(item.id)} className="font-(family-name:--font-space-mono) text-[10px] tracking-[1px] text-[#ff5470] hover:text-[#ff2d55] transition-colors">削除</button>
          </div>
        ))}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input value={newSetlistTitle} onChange={(e) => setNewSetlistTitle(e.target.value)} className="bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors" placeholder="曲名" />
          <input value={newSetlistArtist} onChange={(e) => setNewSetlistArtist(e.target.value)} className="bg-[#060608] border border-[rgba(255,255,255,0.08)] text-[#f0eff5] placeholder-[#6b6a75] px-3 py-2 focus:outline-none focus:border-[#ff2d55] transition-colors" placeholder="アーティスト" />
          <button onClick={handleAddSetlist} className="bg-[#ff2d55] hover:bg-[#ff5470] text-white font-(family-name:--font-space-mono) text-xs tracking-[2px] py-2 px-4 transition-colors">追加</button>
        </div>
      </section>
    </div>
  );
}
