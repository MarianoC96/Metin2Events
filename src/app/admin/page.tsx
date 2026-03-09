'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './admin.module.css';

// ─── Types ──────────────────────────────────────────────────────

interface Stats {
    activeUsers: number;
    totalEvents: number;
    totalEventTypes: number;
    activeSubscriptions: number;
}

interface ImportResult {
    eventsCreated: number;
    eventsSkipped: number;
    eventTypesCreated: number;
}

interface PreviewMessage {
    command: string;
    label: string;
    content: string;
}

interface SubscribeButton {
    emoji: string;
    name: string;
    scheduleSuffix: string;
}

interface BotPreviewData {
    previews: PreviewMessage[];
    subscribe: {
        message: PreviewMessage;
        buttons: SubscribeButton[];
    };
    locale: string;
    timezone: string;
    generatedAt: string;
}

type ViewState = 'idle' | 'loading' | 'success' | 'error';

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Converts markdown bold (*text*) to HTML <strong> and newlines to <br/>.
 * Only supports a safe subset used by the bot strings.
 */
function markdownToHtml(text: string): string {
    return text
        .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
}

// ─── Admin Dashboard Page ───────────────────────────────────────

export default function AdminPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [statsState, setStatsState] = useState<ViewState>('loading');
    const [eventText, setEventText] = useState('');
    const [importState, setImportState] = useState<ViewState>('idle');
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [importError, setImportError] = useState<string>('');
    const [webhookState, setWebhookState] = useState<ViewState>('idle');
    const [webhookMessage, setWebhookMessage] = useState('');

    // Preview state
    const [previewData, setPreviewData] = useState<BotPreviewData | null>(null);
    const [previewState, setPreviewState] = useState<ViewState>('loading');
    const [activePreviewTab, setActivePreviewTab] = useState(0);

    // Client-only time to avoid SSR hydration mismatch
    const [displayTime, setDisplayTime] = useState('--:--');
    useEffect(() => {
        setDisplayTime(
            new Date().toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            })
        );
    }, [previewData, activePreviewTab]);

    const fetchStats = useCallback(async () => {
        setStatsState('loading');
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            if (data.ok) {
                setStats(data.data);
                setStatsState('success');
            } else {
                setStatsState('error');
            }
        } catch {
            setStatsState('error');
        }
    }, []);

    const fetchPreview = useCallback(async () => {
        setPreviewState('loading');
        try {
            const response = await fetch('/api/bot-preview');
            const data = await response.json();
            if (data.ok) {
                setPreviewData(data.data);
                setPreviewState('success');
            } else {
                setPreviewState('error');
            }
        } catch {
            setPreviewState('error');
        }
    }, []);

    useEffect(() => {
        fetchStats();
        fetchPreview();
    }, [fetchStats, fetchPreview]);

    const handleImportEvents = async () => {
        if (!eventText.trim()) {
            return;
        }

        setImportState('loading');
        setImportError('');
        setImportResult(null);

        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: eventText }),
            });
            const data = await response.json();

            if (data.ok) {
                setImportResult(data.data);
                setImportState('success');
                setEventText('');
                fetchStats();
                fetchPreview();
            } else {
                setImportError(data.error ?? 'Import failed');
                setImportState('error');
            }
        } catch {
            setImportError('Network error');
            setImportState('error');
        }
    };

    const handleSetupWebhook = async () => {
        setWebhookState('loading');
        try {
            const response = await fetch('/api/telegram/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const data = await response.json();

            if (data.ok) {
                setWebhookMessage(`✅ Webhook: ${data.webhookUrl}`);
                setWebhookState('success');
            } else {
                setWebhookMessage(`❌ ${data.error}`);
                setWebhookState('error');
            }
        } catch {
            setWebhookMessage('❌ Network error');
            setWebhookState('error');
        }
    };

    // Build the list of all tabs (message previews + subscribe)
    const allTabs = previewData
        ? [...previewData.previews.map((p) => p.label), previewData.subscribe.message.label]
        : [];

    // Determine the selected content
    const isSubscribeTab = previewData
        ? activePreviewTab === previewData.previews.length
        : false;

    const selectedPreview = previewData && !isSubscribeTab
        ? previewData.previews[activePreviewTab]
        : null;

    const currentTime = displayTime;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>🎮 Metin2 Events Bot</h1>
                <p className={styles.subtitle}>Admin Dashboard</p>
            </header>

            {/* ─── Stats Cards ─────────────────────────────────────────── */}
            <section className={styles.statsSection}>
                {statsState === 'loading' && (
                    <div className={styles.statsGrid}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`${styles.statCard} ${styles.skeleton}`}>
                                <div className={styles.skeletonTitle} />
                                <div className={styles.skeletonValue} />
                            </div>
                        ))}
                    </div>
                )}
                {statsState === 'error' && (
                    <div className={styles.errorState}>
                        <p>❌ Error al cargar estadísticas</p>
                        <button onClick={fetchStats} className={styles.retryButton}>
                            🔄 Reintentar
                        </button>
                    </div>
                )}
                {statsState === 'success' && stats && (
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statIcon}>👤</span>
                            <span className={styles.statValue}>{stats.activeUsers}</span>
                            <span className={styles.statLabel}>Usuarios Activos</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statIcon}>📅</span>
                            <span className={styles.statValue}>{stats.totalEvents}</span>
                            <span className={styles.statLabel}>Eventos Totales</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statIcon}>🏷️</span>
                            <span className={styles.statValue}>{stats.totalEventTypes}</span>
                            <span className={styles.statLabel}>Tipos de Evento</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statIcon}>🔔</span>
                            <span className={styles.statValue}>{stats.activeSubscriptions}</span>
                            <span className={styles.statLabel}>Suscripciones</span>
                        </div>
                    </div>
                )}
            </section>

            {/* ─── Bot Preview ──────────────────────────────────────────── */}
            <section className={styles.previewSection}>
                <div className={styles.previewHeader}>
                    <div className={styles.previewHeaderLeft}>
                        <h2 className={styles.sectionTitle}>📱 Vista Previa del Bot</h2>
                        <p className={styles.sectionDescription}>
                            Así se ve cada comando en Telegram. Los datos se obtienen en tiempo real.
                        </p>
                    </div>
                    <button
                        className={styles.previewRefreshButton}
                        onClick={fetchPreview}
                        disabled={previewState === 'loading'}
                    >
                        {previewState === 'loading' ? '⏳ Cargando...' : '🔄 Actualizar'}
                    </button>
                </div>

                {/* Tabs */}
                {previewState === 'success' && previewData && (
                    <div className={styles.previewTabs}>
                        {allTabs.map((label, index) => (
                            <button
                                key={label}
                                className={`${styles.previewTab} ${activePreviewTab === index ? styles.previewTabActive : ''}`}
                                onClick={() => setActivePreviewTab(index)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Chat Window */}
                <div className={styles.chatWindow}>
                    <div className={styles.chatHeader}>
                        <div className={styles.chatAvatar}>🎮</div>
                        <div>
                            <div className={styles.chatBotName}>Metin2 Events Bot</div>
                            <div className={styles.chatBotStatus}>bot</div>
                        </div>
                    </div>

                    <div className={styles.chatBody}>
                        {/* Loading State */}
                        {previewState === 'loading' && (
                            <div className={styles.previewSkeleton}>
                                <div className={styles.previewSkeletonBubble} />
                                <div className={styles.previewSkeletonBubble} />
                                <div className={styles.previewSkeletonBubble} />
                            </div>
                        )}

                        {/* Error State */}
                        {previewState === 'error' && (
                            <div className={styles.errorState}>
                                <p>❌ Error al cargar la vista previa</p>
                                <button onClick={fetchPreview} className={styles.retryButton}>
                                    🔄 Reintentar
                                </button>
                            </div>
                        )}

                        {/* Message Preview */}
                        {previewState === 'success' && selectedPreview && (
                            <>
                                <div className={styles.chatUserCommand}>
                                    {selectedPreview.command}
                                    <div className={styles.chatTime}>{currentTime}</div>
                                </div>
                                <div className={styles.chatBubble}>
                                    <span dangerouslySetInnerHTML={{
                                        __html: markdownToHtml(selectedPreview.content)
                                    }} />
                                    <div className={styles.chatTime}>{currentTime}</div>
                                </div>
                            </>
                        )}

                        {/* Subscribe Preview */}
                        {previewState === 'success' && isSubscribeTab && previewData && (
                            <>
                                <div className={styles.chatUserCommand}>
                                    {previewData.subscribe.message.command}
                                    <div className={styles.chatTime}>{currentTime}</div>
                                </div>
                                <div className={styles.chatBubble}>
                                    <span dangerouslySetInnerHTML={{
                                        __html: markdownToHtml(previewData.subscribe.message.content)
                                    }} />
                                    <div className={styles.chatTime}>{currentTime}</div>
                                </div>
                                <div className={styles.inlineKeyboard}>
                                    {previewData.subscribe.buttons.map((btn) => {
                                        const suffix = btn.scheduleSuffix ? ` ${btn.scheduleSuffix}` : '';
                                        return (
                                            <div key={btn.name} className={styles.inlineButton}>
                                                ⬜ {btn.emoji} {btn.name}{suffix}
                                            </div>
                                        );
                                    })}
                                    <div className={styles.inlineButtonRow}>
                                        <div className={styles.inlineButton}>✅ Suscribirme a TODOS</div>
                                    </div>
                                    <div className={styles.inlineButtonRow}>
                                        <div className={styles.inlineButton}>❌ Cancelar TODAS mis suscripciones</div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Generated timestamp */}
                {previewState === 'success' && previewData && (
                    <p className={styles.previewTimestamp}>
                        Generado: {new Date(previewData.generatedAt).toLocaleString('es-PE')} · Zona: {previewData.timezone}
                    </p>
                )}
            </section>

            {/* ─── Import Events ───────────────────────────────────────── */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>📥 Importar Eventos</h2>
                <p className={styles.sectionDescription}>
                    Pegá el listado de eventos. Los eventos duplicados se detectan automáticamente.
                </p>
                <textarea
                    className={styles.textarea}
                    value={eventText}
                    onChange={(e) => setEventText(e.target.value)}
                    placeholder={`06.03.2026\nDouble Drop Soul Stone 09:00 (CET) - 10:00 (CET)\nChaos Stone Event 11:00 (CET) - 12:00 (CET)\n...`}
                    rows={12}
                />
                <button
                    className={styles.primaryButton}
                    onClick={handleImportEvents}
                    disabled={importState === 'loading' || !eventText.trim()}
                >
                    {importState === 'loading' ? '⏳ Importando...' : '📥 Importar Eventos'}
                </button>

                {importState === 'success' && importResult && (
                    <div className={styles.successMessage}>
                        <p>✅ Importación completada:</p>
                        <ul>
                            <li>🆕 Eventos creados: <strong>{importResult.eventsCreated}</strong></li>
                            <li>⏭️ Duplicados omitidos: <strong>{importResult.eventsSkipped}</strong></li>
                            <li>🏷️ Tipos de evento nuevos: <strong>{importResult.eventTypesCreated}</strong></li>
                        </ul>
                    </div>
                )}

                {importState === 'error' && (
                    <div className={styles.errorMessage}>
                        <p>❌ {importError}</p>
                        <button onClick={handleImportEvents} className={styles.retryButton}>
                            🔄 Reintentar
                        </button>
                    </div>
                )}
            </section>

            {/* ─── Webhook Setup ───────────────────────────────────────── */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>⚙️ Configurar Webhook</h2>
                <p className={styles.sectionDescription}>
                    Registra el webhook de Telegram. Solo necesitás hacerlo una vez después del deploy.
                </p>
                <button
                    className={styles.secondaryButton}
                    onClick={handleSetupWebhook}
                    disabled={webhookState === 'loading'}
                >
                    {webhookState === 'loading' ? '⏳ Configurando...' : '🔗 Configurar Webhook'}
                </button>
                {webhookMessage && (
                    <p className={webhookState === 'success' ? styles.successMessage : styles.errorMessage}>
                        {webhookMessage}
                    </p>
                )}
            </section>
        </div>
    );
}
