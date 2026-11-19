package com.musichub.backend.domain.extraction

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.io.File
import java.nio.file.Files

data class ExtractedMediaResult(
    val audioFile: File,
    val title: String?
)

@Component
class MediaExtractor {

    private val logger = LoggerFactory.getLogger(javaClass)

    fun extractAudio(url: String, workDir: File): ExtractedMediaResult {
        val outputTemplate = File(workDir, "audio.%(ext)s").absolutePath

        // yt-dlp 실행: 오디오만 추출, MP3 변환, 최고 품질
        val processBuilder = ProcessBuilder(
            "yt-dlp",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "--no-playlist",
            "--output", outputTemplate,
            "--print", "title",
            url
        ).directory(workDir)

        logger.info("yt-dlp 실행 시작: url={}", url)
        val process = processBuilder.start()

        val titleOutput = process.inputStream.bufferedReader().use { it.readLine() }
        val errorOutput = process.errorStream.bufferedReader().use { it.readText() }
        val exitCode = process.waitFor()

        if (exitCode != 0) {
            logger.error("yt-dlp 실행 실패 (exit={}): {}", exitCode, errorOutput)
            throw RuntimeException("미디어 추출 실패: $errorOutput")
        }

        val generatedFile = File(workDir, "audio.mp3")
        if (!generatedFile.exists() || generatedFile.length() == 0L) {
            throw IllegalStateException("추출된 오디오 파일이 존재하지 않거나 빈 파일입니다.")
        }

        return ExtractedMediaResult(
            audioFile = generatedFile,
            title = titleOutput?.trim()
        )
    }
}
