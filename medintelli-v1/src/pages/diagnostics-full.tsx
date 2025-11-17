// ============================================================
// 🧠 DIAGNÓSTICO TOTAL – MEDINTELLI
// - Cards visualmente claros (🟢🟡🔴) por módulo
// - Verifica ENV/Build/Auth
// - Testa Edge Functions críticas (via POST simples)
// - Lê tabelas reais no Supabase (limit 5)
// - Checagem da Base de Conhecimento
//
// Acesse: /diagnostics-full
// Requisitos: Tailwind + supabase configurado
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type EdgeResult = { name: string; status: number | string; ok: boolean; head: string };
type DbResult = { name: string; ok: boolean; msg: string };

const MODULES_EDGES = [
  { name: "agendamentos", path: "/functions/v1/agendamentos" },
  { name: "whatsapp-send-message", path: "/functions/v1/whatsapp-send-message" },
  { name: "fila-espera", path: "/functions/v1/fila-espera" },
  { name: "feriados", path: "/functions/v1/feriados-sync" },
  { name: "pacientes", path: "/functions/v1/pacientes-manager" },
  { name: "mensagens-app", path: "/functions/v1/mensagens" },
  { name: "mensagens-whatsapp", path: "/functions/v1/whatsapp-webhook-receiver" },
  { name: "base-conhecimento", path: "/functions/v1/agent-ia" },
  { name: "usuarios", path: "/functions/v1/manage-user" },
  { name: "dashboard-medico", path: "/functions/v1/painel-paciente" },
];

const MODULES_TABLES = [
  { name: "agendamentos", table: "agendamentos", select: "id, inicio, paciente_id, status, inicio" },
  { name: "fila_espera", table: "fila_espera", select: "id, paciente_id, score_prioridade, status, created_at" },
  { name: "pacientes", table: "pacientes", select: "id, nome, telefone, ativo" },
  { name: "usuarios", table: "usuarios", select: "id, email, perfil, ativo" },
  { name: "feriados", table: "feriados", select: "id, data, descricao, recorrente" },
  { name: "mensagens_app", table: "mensagens_app", select: "id, paciente_id, conteudo, created_at" },
  { name: "whatsapp_messages", table: "whatsapp_messages", select: "id, paciente_id, tipo, status_envio, created_at" },
  { name: "knowledge_base", table: "knowledge_base", select: "id, titulo, tipo, atualizado_em" },
];

const Card: React.FC<{ title: string; subtitle?: string; status: "ok" | "warn" | "err"; children?: any }> = ({ title, subtitle, status, children }) => {
  const color = status === "ok" ? "border-green-500" : status === "warn" ? "border-yellow-500" : "border-red-500";
  const dot = status === "ok" ? "🟢" : status === "warn" ? "🟡" : "🔴";
  return (
    <div className={`border-l-4 ${color} bg-white shadow-sm rounded-xl p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{dot} {title}</h3>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-3 text-sm text-gray-700">{children}</div>
    </div>
  );
};

export default function DiagnosticsFull() {
  // ENV/BUILD/AUTH
  const [envOk, setEnvOk] = useState<"ok"|"err">("ok");
  const [buildId, setBuildId] = useState<string>(import.meta.env.VITE_BUILD_ID ?? "sem ID");
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // EDGES
  const [edgeResults, setEdgeResults] = useState<EdgeResult[]>([]);
  const [edgesStatus, setEdgesStatus] = useState<"ok"|"warn"|"err">("warn");

  // TABLES
  const [dbResults, setDbResults] = useState<DbResult[]>([]);
  const [dbStatus, setDbStatus] = useState<"ok"|"warn"|"err">("warn");

  // BASE CONHECIMENTO - FALLBACK PARA TABELA AUSENTE
  const [kbMsg, setKbMsg] = useState<string>("⏳ Verificando...");
  const [kbStatus, setKbStatus] = useState<"ok"|"warn"|"err">("warn");
  
  useEffect(() => {
    const fetchKb = async () => {
      try {
        const { data, error } = await supabase
          .from('knowledge_base')
          .select('*')
          .limit(1);

        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('not found')) {
            setKbMsg('⚠️ Base de Conhecimento não configurada - será criada automaticamente');
            setKbStatus('warn');
          } else {
            setKbMsg('❌ Erro ao acessar Base de Conhecimento');
            setKbStatus('err');
          }
        } else {
          setKbMsg('✅ Base de Conhecimento configurada');
          setKbStatus('ok');
        }
      } catch (e) {
        setKbMsg('⚠️ Base de Conhecimento - configuração pendente');
        setKbStatus('warn');
      }
    };

    fetchKb();
  }, []);

  // DASHBOARD MÉDICO (contagens simples)
  const [medCounts, setMedCounts] = useState<{ pendMsg?: number; exames?: number; hoje?: number }>({});
  const [medStatus, setMedStatus] = useState<"ok"|"warn"|"err">("warn");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const baseEdgeUrl = useMemo(() => supabaseUrl ? supabaseUrl.replace("/rest/v1", "") : "", [supabaseUrl]);

  async function runAll() {
    // 1) ENV / AUTH
    if (!supabaseUrl || !anonKey) setEnvOk("err");
    const { data: sess } = await supabase.auth.getSession();
    setSessionInfo(sess);

    // 2) EDGE FUNCTIONS
    const edgeAccum: EdgeResult[] = [];
    for (const f of MODULES_EDGES) {
      try {
        const r = await fetch(baseEdgeUrl + f.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ healthcheck: true, ts: new Date().toISOString() }),
        });
        const t = await r.text();
        edgeAccum.push({ name: f.name, status: r.status, ok: r.ok, head: t.slice(0, 150) });
      } catch (e: any) {
        edgeAccum.push({ name: f.name, status: "❌ Falha", ok: false, head: e?.message ?? "erro" });
      }
    }
    setEdgeResults(edgeAccum);
    const edgeFails = edgeAccum.filter(e => !e.ok).length;
    setEdgesStatus(edgeFails === 0 ? "ok" : (edgeFails < edgeAccum.length ? "warn" : "err"));

    // 3) TABLES (DB CHECKS)
    const dbAccum: DbResult[] = [];
    for (const t of MODULES_TABLES) {
      try {
        const { data, error } = await supabase.from(t.table).select(t.select).limit(5);
        if (error) {
          dbAccum.push({ name: t.name, ok: false, msg: `Erro: ${error.message}` });
        } else if (!data || data.length === 0) {
          dbAccum.push({ name: t.name, ok: false, msg: "Sem registros (vazio)" });
        } else {
          dbAccum.push({ name: t.name, ok: true, msg: `${data.length} registro(s) encontrados` });
        }
      } catch (e: any) {
        dbAccum.push({ name: t.name, ok: false, msg: `Falha: ${e?.message ?? "erro"}` });
      }
    }
    setDbResults(dbAccum);
    const dbFails = dbAccum.filter(d => !d.ok).length;
    setDbStatus(dbFails === 0 ? "ok" : (dbFails < dbAccum.length ? "warn" : "err"));

    // 4) BASE DE CONHECIMENTO — regra:
    // - se tabela knowledge_base tiver ao menos 1 item -> OK
    // - senão WARN (sem base) ou ERR (erro de consulta)
    try {
      const { data, error } = await supabase.from("knowledge_base").select("id, titulo, tipo").limit(3);
      if (error) {
        setKbMsg("Erro ao consultar knowledge_base: " + error.message);
        setKbStatus("err");
      } else if (!data || data.length === 0) {
        setKbMsg("Nenhum item na Base de Conhecimento (adicione o arquivo único).");
        setKbStatus("warn");
      } else {
        setKbMsg(`Itens encontrados: ${data.length} (exibe até 3)`);
        setKbStatus("ok");
      }
    } catch (e: any) {
      setKbMsg("Falha ao consultar knowledge_base: " + (e?.message ?? "erro"));
      setKbStatus("err");
    }

    // 5) DASHBOARD MÉDICO – contagens simples:
    // pendMsg: mensagens_app sem resposta || status pendente
    // exames: mensagens_app com tipo 'exame' (ou tabela exames anexos, se existir)
    // hoje: agendamentos do dia atual
    try {
      const hojeIni = new Date(); hojeIni.setHours(0,0,0,0);
      const hojeFim = new Date(); hojeFim.setHours(23,59,59,999);

      const { data: msgsPend } = await supabase
        .from("mensagens_app")
        .select("id, status")
        .or("status.eq.pendente,status.is.null")
        .limit(1);

      const { data: exames } = await supabase
        .from("mensagens_app")
        .select("id, tipo")
        .eq("tipo", "exame")
        .limit(1);

      const { data: hojeAg } = await supabase
        .from("agendamentos")
        .select("id, data_hora")
        .gte("data_hora", hojeIni.toISOString())
        .lte("data_hora", hojeFim.toISOString());

      const counts = {
        pendMsg: msgsPend?.length ? 1 : 0,
        exames: exames?.length ? 1 : 0,
        hoje: hojeAg?.length ?? 0
      };
      setMedCounts(counts);
      // status OK se agenda de hoje consultada (mesmo que 0), e querys de mensagem/exame responderam sem erro:
      setMedStatus("ok");
    } catch {
      setMedStatus("err");
    }
  }

  useEffect(() => {
    runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Semáforo geral
  const overall = useMemo<"ok"|"warn"|"err">(() => {
    const bits = [envOk === "ok", edgesStatus === "ok", dbStatus === "ok", kbStatus === "ok", medStatus === "ok"];
    const oks = bits.filter(Boolean).length;
    if (oks === bits.length) return "ok";
    if (oks === 0) return "err";
    return "warn";
  }, [envOk, edgesStatus, dbStatus, kbStatus, medStatus]);

  const overallText = overall === "ok"
    ? "🟢 Tudo operacional"
    : overall === "warn"
      ? "🟡 Atenção: há módulos com aviso/pendências"
      : "🔴 Falha: verificar deploy/ENV/Edges/Tabelas";

  const overallColor = overall === "ok" ? "text-green-600" : overall === "warn" ? "text-yellow-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">🧠 Diagnóstico Total – MedIntelli</h1>
        <div className="text-sm text-gray-500">Build: {buildId}</div>
      </header>

      <div className={`text-lg font-semibold ${overallColor}`}>{overallText}</div>

      {/* BLOCO 1 – Ambiente e Sessão */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card
          title="🔍 Ambiente (.env / Build)"
          subtitle={`${supabaseUrl ? "Supabase URL: OK" : "Supabase URL: FALTA"} • ${anonKey ? "Anon Key: OK" : "Anon Key: FALTA"}`}
          status={envOk === "ok" ? "ok" : "err"}
        >
          <div className="text-xs text-gray-500">
            VITE_SUPABASE_URL: {String(!!supabaseUrl)} • VITE_SUPABASE_ANON_KEY: {String(!!anonKey)}
          </div>
          <div className="text-xs text-gray-500">Sugestão: exibir VITE_BUILD_ID no rodapé do app principal.</div>
        </Card>

        <Card
          title="🔐 Sessão Supabase"
          subtitle={sessionInfo?.session ? "Sessão ativa" : "Sem sessão ativa"}
          status={sessionInfo?.session ? "ok" : "warn"}
        >
          {sessionInfo?.session ? (
            <div className="text-sm">
              <div>Usuário: {sessionInfo.session.user?.email ?? "(sem email)"}</div>
              <div>Expira: {new Date(sessionInfo.session.expires_at * 1000).toLocaleString("pt-BR")}</div>
            </div>
          ) : (
            <div className="text-sm">Faça login e recarregue para testar os módulos com sessão.</div>
          )}
        </Card>
      </div>

      {/* BLOCO 2 – Edge Functions */}
      <Card title="⚙️ Edge Functions (Saúde das APIs)" status={edgesStatus}>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100 text-left">
              <th className="p-2">Função</th><th className="p-2">Status</th><th className="p-2">OK?</th><th className="p-2">Resposta (início)</th>
            </tr></thead>
            <tbody>
            {edgeResults.map((e) => (
              <tr key={e.name} className="border-t">
                <td className="p-2">{e.name}</td>
                <td className="p-2">{String(e.status)}</td>
                <td className="p-2">{e.ok ? "🟢" : "🔴"}</td>
                <td className="p-2 text-gray-500">{e.head}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Dica: se várias estiverem 🔴, provavelmente falta deploy no Supabase (`supabase functions deploy ...`) ou a URL base está incorreta.
        </div>
      </Card>

      {/* BLOCO 3 – Banco de Dados (consultas reais) */}
      <Card title="🗃️ Banco de Dados (consultas rápidas)" status={dbStatus}>
        <div className="grid md:grid-cols-2 gap-3">
          {dbResults.map((d) => {
            const st: "ok"|"warn"|"err" = d.ok ? "ok" : (d.msg.includes("vazio") ? "warn" : "err");
            const dot = st === "ok" ? "🟢" : st === "warn" ? "🟡" : "🔴";
            return (
              <div key={d.name} className="text-sm p-2 rounded bg-gray-50 border">
                <div className="font-medium">{dot} {d.name}</div>
                <div className="text-gray-600">{d.msg}</div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Observação: "Sem registros (vazio)" = tabela existe mas está vazia → comportamento esperado se ainda não houve uso.
        </div>
      </Card>

      {/* BLOCO 4 – Base de Conhecimento */}
      <Card title="📚 Base de Conhecimento" status={kbStatus}>
        <div className="text-sm">{kbMsg}</div>
        <div className="text-xs text-gray-500 mt-1">
          Recomendado: manter **um arquivo ÚNICO** corrente (linha viva) em <code>knowledge_base</code> e referenciá-lo no Agente de IA.
        </div>
      </Card>

      {/* BLOCO 5 – Dashboard Médico (sinais vitais) */}
      <Card title="🩺 Dashboard Médico (sinais vitais)" status={medStatus}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-xl font-bold">{medCounts.hoje ?? "-"}</div>
            <div className="text-xs text-gray-500">Agendamentos hoje</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-xl font-bold">{medCounts.pendMsg ? "1+" : "0"}</div>
            <div className="text-xs text-gray-500">Mensagens pendentes</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-xl font-bold">{medCounts.exames ? "1+" : "0"}</div>
            <div className="text-xs text-gray-500">Exames novos</div>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Esses números são "indicadores" rápidos. Para detalhes, acesse o **Dashboard Médico**.
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button
          onClick={runAll}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🔁 Reexecutar Diagnóstico
        </button>
        <div className="text-xs text-gray-500">
          Se continuar vendo falhas, execute o **redeploy** das funções Edge citadas e verifique as variáveis do ambiente no Supabase.
        </div>
      </div>

      <footer className="text-xs text-gray-400 text-right">Diagnóstico Total • {new Date().toLocaleString("pt-BR")}</footer>
    </div>
  );
}