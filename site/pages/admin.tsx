import { useEffect, useState } from 'react';
import Head from 'next/head';
import { IconSprite, Logo } from '@/components/Icons';
import { carregarImagem, carregarModelos, detectarRostos } from '@/lib/faceRecognition';

type FotoAdmin = { id: string; nomeOriginal: string; rostos: number; criadaEm: string };
type ItemFila = { nome: string; status: 'pendente' | 'enviando' | 'ok' | 'erro'; mensagem?: string };

export default function Admin() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [senha, setSenha] = useState('');
  const [loginErro, setLoginErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const [modelosProntos, setModelosProntos] = useState(false);
  const [erroModelos, setErroModelos] = useState<string | null>(null);
  const [fotos, setFotos] = useState<FotoAdmin[]>([]);
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch('/api/admin-check')
      .then((r) => r.json())
      .then((d) => setAutenticado(Boolean(d.autenticado)))
      .catch(() => setAutenticado(false));
  }, []);

  useEffect(() => {
    if (!autenticado) return;
    carregarModelos()
      .then(() => setModelosProntos(true))
      .catch((e) => {
        console.error(e);
        setErroModelos('Não consegui carregar o reconhecimento facial. Confira sua conexão e recarregue a página.');
      });
    carregarFotos();
  }, [autenticado]);

  function carregarFotos() {
    fetch('/api/admin/photos')
      .then((r) => r.json())
      .then((d) => setFotos(d.fotos ?? []));
  }

  async function entrar(ev: React.FormEvent) {
    ev.preventDefault();
    setEntrando(true);
    setLoginErro(null);
    try {
      const resp = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      });
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        setLoginErro(d.erro || 'Não consegui entrar.');
        return;
      }
      setAutenticado(true);
    } catch (e) {
      console.error(e);
      setLoginErro('Deu um erro. Tente de novo.');
    } finally {
      setEntrando(false);
    }
  }

  async function sair() {
    await fetch('/api/admin-logout', { method: 'POST' });
    setAutenticado(false);
    setSenha('');
  }

  async function enviarFotos(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    const lista = Array.from(arquivos);
    setFila(lista.map((f) => ({ nome: f.name, status: 'pendente' })));
    setEnviando(true);

    for (let i = 0; i < lista.length; i++) {
      const arquivo = lista[i];
      setFila((atual) => atual.map((it, idx) => (idx === i ? { ...it, status: 'enviando' } : it)));
      try {
        const img = await carregarImagem(arquivo);
        const rostos = await detectarRostos(img);
        if (rostos.length === 0) {
          setFila((atual) => atual.map((it, idx) => (idx === i ? { ...it, status: 'erro', mensagem: 'nenhum rosto detectado' } : it)));
          continue;
        }

        const formData = new FormData();
        formData.append('foto', arquivo);
        formData.append('descritores', JSON.stringify(rostos.map((r) => Array.from(r.descriptor))));

        const resp = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!resp.ok) {
          const d = await resp.json().catch(() => ({}));
          setFila((atual) => atual.map((it, idx) => (idx === i ? { ...it, status: 'erro', mensagem: d.erro || 'falha no envio' } : it)));
          continue;
        }
        setFila((atual) => atual.map((it, idx) => (idx === i ? { ...it, status: 'ok', mensagem: `${rostos.length} rosto${rostos.length > 1 ? 's' : ''}` } : it)));
      } catch (e) {
        console.error(e);
        setFila((atual) => atual.map((it, idx) => (idx === i ? { ...it, status: 'erro', mensagem: 'erro inesperado' } : it)));
      }
    }

    setEnviando(false);
    carregarFotos();
  }

  async function apagarFoto(id: string) {
    if (!confirm('Apagar esta foto?')) return;
    await fetch(`/api/admin/photos/${id}`, { method: 'DELETE' });
    carregarFotos();
  }

  return (
    <>
      <Head>
        <title>Área do dono — Nascer do Sol Copacabana</title>
      </Head>
      <IconSprite />
      <Logo />

      <div className="container">
        {autenticado === null && <p style={{ textAlign: 'center', marginTop: 40 }}>Carregando…</p>}

        {autenticado === false && (
          <div className="card" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#12688C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <use href="#i-lock" />
              </svg>
              <h2 style={{ margin: 0 }}>Área do dono</h2>
            </div>
            <p className="hint">Só quem sobe as fotos do evento entra aqui.</p>
            <form onSubmit={entrar}>
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoFocus
              />
              <button className="btn btn-ocean" type="submit" disabled={entrando || senha.length === 0}>
                {entrando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
            {loginErro && <div className="status erro" style={{ textAlign: 'left' }}>{loginErro}</div>}
          </div>
        )}

        {autenticado === true && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
              <h1 style={{ fontSize: 24 }}>Fotos do evento</h1>
              <button className="btn btn-ghost btn-small" onClick={sair}>Sair</button>
            </div>

            <div className="card">
              <h2>Subir fotos</h2>
              <div className="hint">Pode selecionar várias de uma vez. Cada rosto detectado fica pronto pra busca.</div>
              <label className="drop">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={!modelosProntos || enviando}
                  onChange={(e) => enviarFotos(e.target.files)}
                />
                <div className="icon-badge">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#12688C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <use href="#i-upload-cloud" />
                  </svg>
                </div>
                <div>
                  <div className="label">
                    {erroModelos ? 'Reconhecimento indisponível' : !modelosProntos ? 'Carregando reconhecimento facial…' : 'Escolher fotos'}
                  </div>
                  <div className="sub">{erroModelos ?? 'Nenhuma foto selecionada'}</div>
                </div>
              </label>

              {fila.length > 0 && (
                <ul className="admin-lista" style={{ marginTop: 16 }}>
                  {fila.map((item, i) => (
                    <li key={i} className="admin-item">
                      <div className="info">
                        <div className="nome">{item.nome}</div>
                        <div className="meta">
                          {item.status === 'pendente' && 'na fila…'}
                          {item.status === 'enviando' && 'enviando…'}
                          {item.status === 'ok' && `✅ ${item.mensagem}`}
                          {item.status === 'erro' && `⚠️ ${item.mensagem}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <div className="result-head">
                <h2 style={{ margin: 0 }}>Já publicadas</h2>
                <span className="result-count">{fotos.length} foto{fotos.length === 1 ? '' : 's'}</span>
              </div>
              {fotos.length === 0 && <p className="hint" style={{ marginBottom: 0 }}>Nenhuma foto publicada ainda.</p>}
              <ul className="admin-lista">
                {fotos.map((foto) => (
                  <li key={foto.id} className="admin-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/photos/${foto.id}`} alt="" />
                    <div className="info">
                      <div className="nome">{foto.nomeOriginal}</div>
                      <div className="meta">{foto.rostos} rosto{foto.rostos === 1 ? '' : 's'}</div>
                    </div>
                    <button className="btn btn-ghost btn-small" onClick={() => apagarFoto(foto.id)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <use href="#i-trash" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}
