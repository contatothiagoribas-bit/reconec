import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { IconSprite, Logo } from '@/components/Icons';
import { carregarImagem, carregarModelos, detectarRostoPrincipal } from '@/lib/faceRecognition';

type Resultado = { id: string; distancia: number };

export default function Home() {
  const [modelosProntos, setModelosProntos] = useState(false);
  const [erroModelos, setErroModelos] = useState<string | null>(null);
  const [arquivoSelfie, setArquivoSelfie] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [status, setStatus] = useState('');
  const [statusErro, setStatusErro] = useState(false);
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [threshold, setThreshold] = useState(0.6);

  useEffect(() => {
    carregarModelos()
      .then(() => setModelosProntos(true))
      .catch((e) => {
        console.error(e);
        setErroModelos('Não consegui carregar o reconhecimento facial. Confira sua conexão e recarregue a página.');
      });
  }, []);

  async function buscar() {
    if (!arquivoSelfie) {
      setStatus('Selecione ou tire uma selfie.');
      setStatusErro(true);
      return;
    }
    setProcessando(true);
    setResultados(null);
    setStatusErro(false);

    try {
      setStatus('Lendo a sua selfie…');
      const img = await carregarImagem(arquivoSelfie);
      const descriptor = await detectarRostoPrincipal(img);
      if (!descriptor) {
        setStatus('Não encontrei nenhum rosto na selfie. Tente outra foto, de frente e bem iluminada.');
        setStatusErro(true);
        setProcessando(false);
        return;
      }

      setStatus('Comparando com as fotos do evento…');
      const resp = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: Array.from(descriptor) }),
      });
      if (!resp.ok) throw new Error('busca falhou');
      const data: { resultados: Resultado[] } = await resp.json();
      setResultados(data.resultados);
      setStatus('');
    } catch (e) {
      console.error(e);
      setStatus('Deu um erro na busca. Tente de novo.');
      setStatusErro(true);
    } finally {
      setProcessando(false);
    }
  }

  function baixarFoto(id: string) {
    const a = document.createElement('a');
    a.href = `/api/photos/${id}?download=1`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const encontradas = (resultados ?? []).filter((r) => r.distancia < threshold);
  const buscaFeita = resultados !== null;

  return (
    <>
      <Head>
        <title>Encontrar minhas fotos — Nascer do Sol Copacabana</title>
      </Head>
      <IconSprite />
      <Logo />

      <div className="container">
        <div style={{ textAlign: 'center', margin: '20px 0 24px' }}>
          <h1 style={{ fontSize: 26 }}>Encontrar minhas fotos</h1>
          <p style={{ fontSize: 14.5, color: 'oklch(45% 0.02 250)', marginTop: 8 }}>
            Envie a sua selfie — a gente acha as suas fotos do evento na hora.
          </p>
        </div>

        <div className="card">
          <h2>Sua selfie</h2>
          <div className="hint">De frente, com boa luz.</div>
          <label className="drop sunset">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setArquivoSelfie(e.target.files?.[0] ?? null)}
            />
            <div className="icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F2793C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <use href="#i-face-scan" />
              </svg>
            </div>
            <div>
              <div className="label">{arquivoSelfie ? 'Selfie selecionada' : 'Tire ou envie uma selfie'}</div>
              <div className="sub">{arquivoSelfie ? arquivoSelfie.name : 'Nenhuma foto selecionada'}</div>
            </div>
          </label>
        </div>

        <button className="btn" disabled={!modelosProntos || processando} onClick={buscar}>
          {erroModelos ? 'Reconhecimento indisponível' : !modelosProntos ? 'Carregando reconhecimento facial…' : processando ? 'Buscando…' : 'Encontrar minhas fotos'}
        </button>
        <div className={`status${statusErro || erroModelos ? ' erro' : ''}`}>{erroModelos ?? status}</div>

        {buscaFeita && (
          <div className="card">
            <div className="result-head">
              <h2 style={{ margin: 0 }}>Suas fotos</h2>
              <span className="result-count">{encontradas.length} foto{encontradas.length === 1 ? '' : 's'}</span>
            </div>

            {resultados && resultados.length > 0 && (
              <div className="sensib">
                <div className="sensib-label">
                  <span>Sensibilidade</span>
                  <span>{threshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.45}
                  max={0.75}
                  step={0.01}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
                <div className="sensib-hint">
                  Puxe pra direita se está deixando fotos de fora; pra esquerda se está trazendo gente errada.
                </div>
              </div>
            )}

            <div className="grid">
              {(resultados ?? []).map((r) => {
                const isMatch = r.distancia < threshold;
                return (
                  <div
                    key={r.id}
                    className={`photo${isMatch ? ' encontrado' : ' nao-encontrado'}`}
                    onClick={() => isMatch && baixarFoto(r.id)}
                    title={isMatch ? 'Clique para baixar em alta qualidade' : undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/photos/${r.id}`} alt="" />
                    {isMatch && (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" className="badge">
                          <circle cx="12" cy="12" r="10" fill="#F2793C" />
                          <path d="M7 12.5l3 3 7-7" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="download-overlay">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <use href="#i-download" />
                          </svg>
                          Baixar
                        </div>
                      </>
                    )}
                    <span className="dist">{r.distancia.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {resultados && resultados.length === 0 && (
              <p style={{ fontSize: 14, color: 'oklch(45% 0.02 250)', textAlign: 'center' }}>
                Não encontramos nenhuma foto com você nesse evento.
              </p>
            )}
          </div>
        )}

        <div className="rodape">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <use href="#i-shield-check" />
          </svg>
          Sua selfie é processada no seu navegador — só a assinatura facial é comparada, nunca sua foto
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/admin" style={{ fontSize: 12, color: 'oklch(55% 0.02 250)' }}>Sou o dono do site</Link>
        </div>
      </div>
    </>
  );
}
