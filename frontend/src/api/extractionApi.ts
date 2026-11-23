import { apiClient } from './client';
import type { ExtractionJobDto, ExtractionRequest } from '../types/extraction';

export const extractionApi = {
  /**
   * 유튜브 음원 추출 작업 생성 요청
   */
  async requestExtraction(sourceUrl: string): Promise<ExtractionJobDto> {
    const payload: ExtractionRequest = { sourceUrl: sourceUrl.trim() };
    const response = await apiClient.post<ExtractionJobDto>('/extractions', payload);
    return response.data;
  },

  /**
   * 단건 추출 작업 상태 조회
   */
  async getExtractionStatus(id: number): Promise<ExtractionJobDto> {
    const response = await apiClient.get<ExtractionJobDto>(`/extractions/${id}`);
    return response.data;
  },

  /**
   * 내 추출 작업 히스토리 목록 조회
   */
  async listMyExtractions(): Promise<ExtractionJobDto[]> {
    const response = await apiClient.get<ExtractionJobDto[]>('/extractions');
    return response.data;
  },
};
