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

type ViewState = 'idle' | 'loading' | 'success' | 'error';

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

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

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
