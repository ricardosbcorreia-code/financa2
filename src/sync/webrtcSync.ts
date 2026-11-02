import { store } from '../state';
import { mergeBackupData } from './importExport';

/**
 * Gerenciador de conexão WebRTC Peer-to-Peer para troca direta entre smartphones.
 */
export class P2PSyncService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  private createConnection(): RTCPeerConnection {
    // Utiliza servidores STUN públicos gratuitos para negociação de ICE na rede Wi-Fi local
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    return pc;
  }

  /**
   * Prepara os dados locais para envio via P2P
   */
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
   * Inicia o fluxo de Oferta (Dispositivo A)
   */
  public async createOffer(): Promise<{ offerCode: string; onConnected: Promise<void> }> {
    this.peerConnection = this.createConnection();
    this.dataChannel = this.peerConnection.createDataChannel('financa2_sync', {
      ordered: true
    });

    const connectedPromise = new Promise<void>((resolve, reject) => {
      if (!this.dataChannel) return reject(new Error('DataChannel não inicializado'));

      this.dataChannel.onopen = () => {
        // Envia payload local
        const payload = JSON.stringify(this.getLocalPayload());
        this.dataChannel?.send(payload);
      };

      this.dataChannel.onmessage = async (event) => {
        try {
          const remoteData = JSON.parse(event.data);
          await mergeBackupData(remoteData);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
    });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Aguarda coleta dos candidatos ICE locais (timeout máx 1s para velocidade)
    await new Promise<void>((resolve) => {
      if (this.peerConnection?.iceGatheringState === 'complete') {
        resolve();
      } else {
        const checkState = () => {
          if (this.peerConnection?.iceGatheringState === 'complete') {
            this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        this.peerConnection?.addEventListener('icegatheringstatechange', checkState);
        setTimeout(resolve, 800);
      }
    });

    const offerSdp = this.peerConnection.localDescription?.sdp || '';
    // Codifica oferta em base64 segura para QR code
    const offerCode = btoa(unescape(encodeURIComponent(JSON.stringify({ sdp: offerSdp, type: 'offer' }))));

    return { offerCode, onConnected: connectedPromise };
  }

  /**
   * Processa a Oferta e gera a Resposta (Dispositivo B)
   */
  public async handleOfferAndCreateAnswer(
    offerCode: string
  ): Promise<{ answerCode: string; onConnected: Promise<void> }> {
    this.peerConnection = this.createConnection();

    const offerJson = JSON.parse(decodeURIComponent(escape(atob(offerCode))));

    const connectedPromise = new Promise<void>((resolve, reject) => {
      this.peerConnection!.ondatachannel = (event) => {
        this.dataChannel = event.channel;

        this.dataChannel.onopen = () => {
          // Envia seus próprios dados para o outro celular
          const payload = JSON.stringify(this.getLocalPayload());
          this.dataChannel?.send(payload);
        };

        this.dataChannel.onmessage = async (msgEvent) => {
          try {
            const remoteData = JSON.parse(msgEvent.data);
            await mergeBackupData(remoteData);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
      };
    });

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerJson.sdp }));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    await new Promise<void>((resolve) => {
      if (this.peerConnection?.iceGatheringState === 'complete') {
        resolve();
      } else {
        const checkState = () => {
          if (this.peerConnection?.iceGatheringState === 'complete') {
            this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        this.peerConnection?.addEventListener('icegatheringstatechange', checkState);
        setTimeout(resolve, 800);
      }
    });

    const answerSdp = this.peerConnection.localDescription?.sdp || '';
    const answerCode = btoa(unescape(encodeURIComponent(JSON.stringify({ sdp: answerSdp, type: 'answer' }))));

    return { answerCode, onConnected: connectedPromise };
  }

  public async completeHandshake(answerCode: string): Promise<void> {
    if (!this.peerConnection) return;
    const answerJson = JSON.parse(decodeURIComponent(escape(atob(answerCode))));
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp: answerJson.sdp })
    );
  }

  public close(): void {
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.dataChannel = null;
    this.peerConnection = null;
  }
}

export const p2pService = new P2PSyncService();
