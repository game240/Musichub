package com.musichub.backend.domain.extraction

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

data class ExtractedMediaResult(
    val audioFile: File,
    val title: String?
)

@Component
class MediaExtractor {

    private val logger = LoggerFactory.getLogger(javaClass)

    fun extractAudio(
        url: String,
        workDir: File,
        onProcessStarted: ((Process) -> Unit)? = null
    ): ExtractedMediaResult {
        val outputTemplate = File(workDir, "audio.%(ext)s").absolutePath

        // yt-dlp 실행: 오디오만 추출, MP3 변환, 최고 품질, 썸네일/메타데이터 임베딩, 최대 30분 제한
        val command = listOf(
            "yt-dlp",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "--no-playlist",
            "--embed-thumbnail",
            "--add-metadata",
            "--match-filter", "duration <= 1800",
            "--output", outputTemplate,
            "--no-warnings",
            "--print", "title",
            url
        )

        val processBuilder = ProcessBuilder(command)
            .directory(workDir)

        logger.info("yt-dlp 실행 시작: url={}", url)
        val process: Process
        try {
            process = processBuilder.start()
            onProcessStarted?.invoke(process)
        } catch (e: IOException) {
            logger.error("yt-dlp 프로세스 실행 실패: {}", e.message)
            throw RuntimeException("추출 엔진(yt-dlp)을 실행할 수 없습니다. 시스템 설정을 확인해주세요: ${e.message}", e)
        }

        var titleOutput: String? = null
        var errorOutput = ""

        try {
            val titleReaderThread = Thread {
                try {
                    titleOutput = process.inputStream.bufferedReader().use { it.readLine() }
                } catch (e: Exception) {
                    logger.debug("Stdout 읽기 중 예외: {}", e.message)
                }
            }
            titleReaderThread.start()

            val errorReaderThread = Thread {
                try {
                    errorOutput = process.errorStream.bufferedReader().use { it.readText() }
                } catch (e: Exception) {
                    logger.debug("Stderr 읽기 중 예외: {}", e.message)
                }
            }
            errorReaderThread.start()

            val finished = process.waitFor(5, TimeUnit.MINUTES)
            titleReaderThread.join(1000)
            errorReaderThread.join(1000)

            if (!finished) {
                process.destroyForcibly()
                logger.error("yt-dlp 실행 타임아웃 (5분 초과)")
                throw TimeoutException("음원 추출 시간이 5분을 초과하여 작업이 취소되었습니다.")
            }

            val exitCode = process.exitValue()
            if (exitCode != 0) {
                logger.error("yt-dlp 실행 실패 (exit={}): {}", exitCode, errorOutput)
                val friendlyMessage = parseFriendlyErrorMessage(errorOutput)
                throw RuntimeException(friendlyMessage)
            }
        } catch (e: Exception) {
            if (process.isAlive) {
                process.destroyForcibly()
            }
            throw e
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

    private fun parseFriendlyErrorMessage(rawError: String): String {
        return when {
            rawError.contains("does not pass filter duration", ignoreCase = true) ->
                "재생 시간이 30분을 초과하는 영상은 추출할 수 없습니다."
            rawError.contains("Private video", ignoreCase = true) ->
                "비공개 영상은 추출할 수 없습니다."
            rawError.contains("Video unavailable", ignoreCase = true) ->
                "해당 영상을 찾을 수 없거나 삭제되었습니다."
            rawError.contains("Sign in to confirm your age", ignoreCase = true) ||
            rawError.contains("Sign in if you've been granted access", ignoreCase = true) ->
                "연령 제한 또는 접근 권한이 필요한 영상입니다."
            rawError.contains("This live event will begin", ignoreCase = true) ||
            rawError.contains("is a live stream", ignoreCase = true) ->
                "라이브 스트리밍 영상은 추출할 수 없습니다."
            rawError.contains("copyright", ignoreCase = true) ->
                "저작권 제한으로 인해 추출할 수 없는 영상입니다."
            rawError.isNotBlank() ->
                "미디어 추출 실패: ${rawError.lines().lastOrNull { it.isNotBlank() } ?: rawError}"
            else -> "미디어 추출 중 알 수 없는 오류가 발생했습니다."
        }
    }
}
