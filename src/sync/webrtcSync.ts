import Peer, { DataConnection } from 'peerjs';
import { store } from '../state';
import { mergeBackupData } from './importExport';
import { MergeResult } from './mergeEngine';

const PEER_PREFIX = 'financa2-sync-room-';

export interface SyncCallbacks {
  onStatusChange?: (status: string) => void;
  onSuccess?: (result: MergeResult) => void;
  onError?: (errMessage: string) => void;
}

/**
 * Gerenciador de conexão WebRTC P2P real usando PeerJS + STUN.
 * Permite parear os dois celulares usando apenas um código curto de 6 dígitos ou leitura de QR Code,
 * realizando a troca bidirecional automática (Aparelho 1 <-> Aparelho 2) sem copiar textos longos.
 */
export class P2PSyncService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;

  public getLocalPayload() {
    return {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      activeProfile: store.getActiveProfile(),
      transactions: store.getAllTransactionsRaw(),
      categories: store.getCategories(),
      rules: store.getRules(),
      incomes: store.getAllIncomesRaw(),
      fixedExpenses: store.getAllFixedExpensesRaw()
    };
  }

  /**
   * Gera um código numérico curto de 6 dígitos (ex: "482910")
   */
  private generateRoomPin(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  /**
   * Inicia sala de pareamento no Aparelho 1 (Anfitrião)
   * Retorna o PIN de 6 dígitos para exibir em tela e no QR Code.
   */
  public async startHostSession(callbacks: SyncCallbacks): Promise<string> {
    this.close();

    const pin = this.generateRoomPin();
    const peerId = `${PEER_PREFIX}${pin}`;

    return new Promise<string>((resolve, reject) => {
      try {
        this.peer = new Peer(peerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ]
          }
        });

        const timeout = window.setTimeout(() => {
          reject(new Error('Tempo esgotado ao registrar sala de pareamento. Verifique sua conexão com a internet.'));
        }, 12000);

        this.peer.on('open', () => {
          window.clearTimeout(timeout);
          callbacks.onStatusChange?.('Aguardando leitura do QR Code ou código no outro celular...');
          resolve(pin);
        });

        this.peer.on('connection', (incomingConn) => {
          this.conn = incomingConn;
          callbacks.onStatusChange?.('📲 Outro celular detectado! Trocando dados...');

          incomingConn.on('open', () => {
            // Assim que abrir o canal, envia nosso payload completo para o celular 2
            incomingConn.send({
              type: 'SYNC_PAYLOAD',
              payload: this.getLocalPayload()
            });
          });

          incomingConn.on('data', async (rawData: any) => {
            try {
              const msg = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
              if (msg && msg.type === 'SYNC_PAYLOAD' && msg.payload) {
                const mergeRes = await mergeBackupData(msg.payload);
                // Envia confirmação final ao celular 2
                incomingConn.send({ type: 'SYNC_ACK' });
                callbacks.onSuccess?.(mergeRes);
              }
            } catch (err) {
              callbacks.onError?.('Erro ao processar dados recebidos do outro aparelho.');
            }
          });

          incomingConn.on('error', () => {
            callbacks.onError?.('Falha na transmissão de dados entre os aparelhos.');
          });
        });

        this.peer.on('error', (err: any) => {
          window.clearTimeout(timeout);
          if (err?.type === 'unavailable-id') {
            // Se o código de 6 dígitos colidir, tenta gerar outro automaticamente
            this.startHostSession(callbacks).then(resolve).catch(reject);
            return;
          }
          callbacks.onError?.('Erro de comunicação P2P: verifique se ambos estão conectados à internet.');
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Conecta o Aparelho 2 ao Aparelho 1 usando o PIN de 6 dígitos (lido via QR Code ou digitado)
   */
  public async joinSessionWithPin(rawPin: string, callbacks: SyncCallbacks): Promise<void> {
    this.close();

    // Limpa espaços, traços ou prefixos de URL caso venha da câmera
    const cleanPin = rawPin.replace(/\D/g, '').slice(-6);
    if (cleanPin.length !== 6) {
      callbacks.onError?.('Código inválido. O código de pareamento deve conter 6 dígitos.');
      return;
    }

    const targetPeerId = `${PEER_PREFIX}${cleanPin}`;
    callbacks.onStatusChange?.(`Conectando ao aparelho (${cleanPin.slice(0, 3)}-${cleanPin.slice(3)})...`);

    return new Promise<void>((resolve, reject) => {
      this.peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      let mergeResultCache: MergeResult | null = null;
      let finished = false;

      const finishSuccess = (res: MergeResult) => {
        if (finished) return;
        finished = true;
        callbacks.onSuccess?.(res);
        setTimeout(() => this.close(), 800);
        resolve();
      };

      this.peer.on('open', () => {
        const conn = this.peer!.connect(targetPeerId, { reliable: true });
        this.conn = conn;

        conn.on('open', () => {
          callbacks.onStatusChange?.('🔄 Conectado! Sincronizando lançamentos...');
          // Envia imediatamente os dados locais do Aparelho 2 para o Aparelho 1
          conn.send({
            type: 'SYNC_PAYLOAD',
            payload: this.getLocalPayload()
          });
        });

        conn.on('data', async (rawData: any) => {
          try {
            const msg = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            if (msg && msg.type === 'SYNC_PAYLOAD' && msg.payload) {
              mergeResultCache = await mergeBackupData(msg.payload);
              // Se já recebeu o payload do Aparelho 1, aguarda brevemente o ACK ou finaliza
              setTimeout(() => {
                if (mergeResultCache) finishSuccess(mergeResultCache);
              }, 500);
            } else if (msg && msg.type === 'SYNC_ACK' && mergeResultCache) {
              finishSuccess(mergeResultCache);
            }
          } catch (err) {
            callbacks.onError?.('Erro ao mesclar os dados recebidos.');
            reject(err);
          }
        });

        conn.on('error', (err) => {
          callbacks.onError?.('Falha durante a troca de dados.');
          reject(err);
        });
      });

      this.peer.on('error', (err: any) => {
        if (err?.type === 'peer-unavailable') {
          callbacks.onError?.('Código não encontrado ou expirado. Verifique se a tela do código continua aberta no outro celular.');
        } else {
          callbacks.onError?.('Não foi possível conectar ao outro celular. Verifique a conexão.');
        }
        reject(err);
      });
    });
  }

  public close(): void {
    try {
      this.conn?.close();
    } catch {
      // Ignore
    }
    try {
      this.peer?.destroy();
    } catch {
      // Ignore
    }
    this.conn = null;
    this.peer = null;
  }
}

export const p2pService = new P2PSyncService();
