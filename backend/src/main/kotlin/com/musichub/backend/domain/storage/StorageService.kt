package com.musichub.backend.domain.storage

import java.io.InputStream
import java.time.Duration

data class StorageObjectMetadata(
    val key: String,
    val contentLength: Long,
    val contentType: String?
)

interface StorageService {
    /** 스트리밍 재생용 임시 GET URL 생성 (기본 1시간 유효) */
    fun generatePresignedGetUrl(key: String, duration: Duration = Duration.ofHours(1)): String

    /** 음원 파일 다운로드용 임시 GET URL 생성 (Content-Disposition: attachment 첨부, 기본 15분 유효) */
    fun generatePresignedDownloadUrl(
        key: String,
        downloadFilename: String,
        duration: Duration = Duration.ofMinutes(15)
    ): String

    /** 브라우저 직접 업로드용 임시 PUT URL 생성 (기본 15분 유효) */
    fun generatePresignedPutUrl(key: String, mimeType: String, duration: Duration = Duration.ofMinutes(15)): String

    /** 서버에서 파일 업로드 (추출 파일, 앨범 커버 등) */
    fun upload(key: String, inputStream: InputStream, contentLength: Long, mimeType: String)

    /** 파일 다운로드 (메타데이터 분석용 스트림) */
    fun getObject(key: String): InputStream

    /** 파일 메타데이터 조회 */
    fun getMetadata(key: String): StorageObjectMetadata

    /** 파일 삭제 */
    fun delete(key: String)
}
