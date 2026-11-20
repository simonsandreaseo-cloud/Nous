import React from 'react';
import { useHumanizerSession } from './features/humanizer-studio/useHumanizerSession';
import StudioHeader from './features/humanizer-studio/StudioHeader';
import DraftInputPanel from './features/humanizer-studio/DraftInputPanel';
import HumanizedOutputPanel from './features/humanizer-studio/HumanizedOutputPanel';
import ParagraphAuditDrawer from './features/paragraph-audit-inspector/ParagraphAuditDrawer';
import RuntimeLogsModal from './features/runtime-logs-viewer/RuntimeLogsModal';
import BankGapsRadarModal from './features/bank-gaps-radar/BankGapsRadarModal';

export default function App() {
  const s = useHumanizerSession();

  return (
    <div className="flex flex-col h-screen bg-[#0d0f17] text-slate-100 font-sans">
      <StudioHeader
        bankStats={s.bankStats}
        isReloadingBank={s.isReloadingBank}
        onReloadBank={s.handleReloadBank}
        ollamaStatus={s.ollamaStatus}
        onRefreshOllamaStatus={s.refreshOllamaStatus}
        onLoadShortSample={() => { s.setInputText(s.shortBohoArticle); s.setAuditTrail([]); }}
        onLoadFullSample={() => { s.setInputText(s.fullBohoArticle); s.setAuditTrail([]); }}
        onClearAll={() => { s.setInputText(''); s.setOutputText(''); s.setAuditTrail([]); }}
        auditTrailLength={s.auditTrail.length}
        showAuditPanel={s.showAuditPanel}
        onToggleAuditPanel={() => s.setShowAuditPanel(prev => !prev)}
        bankGapsRegistry={s.bankGapsRegistry}
        onOpenBankGaps={s.handleOpenBankGaps}
        onOpenLogs={s.handleOpenLogs}
      />

      <main className="flex-1 flex overflow-hidden">
        <DraftInputPanel
          inputText={s.inputText}
          setInputText={s.setInputText}
          inputWords={s.inputWords}
          errorMsg={s.errorMsg}
          antiOutro={s.antiOutro}
          setAntiOutro={s.setAntiOutro}
          injectGlitches={s.injectGlitches}
          setInjectGlitches={s.setInjectGlitches}
          useLocalLLM={s.useLocalLLM}
          setUseLocalLLM={s.setUseLocalLLM}
          enableCarrilB={s.enableCarrilB}
          setEnableCarrilB={s.setEnableCarrilB}
          domainId={s.domainId}
          setDomainId={s.setDomainId}
          domainPacks={s.domainPacks}
          modelName={s.modelName}
          setModelName={s.setModelName}
          modelOptions={s.modelOptions}
          isProcessing={s.isProcessing}
          onHumanize={s.handleHumanize}
        />

        <HumanizedOutputPanel
          outputText={s.outputText}
          outputWords={s.outputWords}
          copied={s.copied}
          onCopy={s.handleCopy}
          onDownload={s.handleDownload}
          metrics={s.metrics}
          auditTrailLength={s.auditTrail.length}
          onOpenBankGaps={s.handleOpenBankGaps}
          onToggleAuditPanel={() => s.setShowAuditPanel(prev => !prev)}
        />
      </main>

      <ParagraphAuditDrawer
        isOpen={s.showAuditPanel}
        auditTrail={s.auditTrail}
        expandedParas={s.expandedParas}
        toggleParaExpand={s.toggleParaExpand}
        onClose={() => s.setShowAuditPanel(false)}
      />

      <RuntimeLogsModal
        isOpen={s.showLogs}
        onClose={() => s.setShowLogs(false)}
        logsContent={s.logsContent}
        logFilter={s.logFilter}
        setLogFilter={s.setLogFilter}
        logsCopied={s.logsCopied}
        onCopyLogs={s.handleCopyLogs}
        onClearLogs={s.handleClearLogs}
      />

      <BankGapsRadarModal
        isOpen={s.showBankGaps}
        onClose={() => s.setShowBankGaps(false)}
        registry={s.bankGapsRegistry}
        bankStats={s.bankStats}
        onRefresh={s.refreshBankRadar}
        onReloadBank={s.handleReloadBank}
        onUpdateStatus={s.handleUpdateGapStatus}
        onClearResolved={s.handleClearResolvedGaps}
        onCopyBrief={s.handleCopyGapsBrief}
        onOpenFile={() => window.api?.openBankGapsFile?.()}
        onResetUsage={s.handleResetDonorUsage}
        isReloading={s.isReloadingBank}
        briefCopied={s.briefCopied}
      />
    </div>
  );
}
