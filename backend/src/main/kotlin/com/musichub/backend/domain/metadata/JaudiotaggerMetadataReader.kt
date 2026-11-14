package com.musichub.backend.domain.metadata

import org.jaudiotagger.audio.AudioFileIO
import org.jaudiotagger.tag.FieldKey
import org.jaudiotagger.tag.TagOptionSingleton
import org.jaudiotagger.tag.id3.ID3v23Tag
import org.jaudiotagger.tag.id3.ID3v24Tag
import org.jaudiotagger.tag.reference.ID3V2Version
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.io.File
import java.io.InputStream
import java.nio.file.Files

interface MetadataReader {
    fun read(file: File): AudioMetadata
    fun read(inputStream: InputStream, extension: String = "mp3"): AudioMetadata
}

@Component
class JaudiotaggerMetadataReader : MetadataReader {

    private val logger = LoggerFactory.getLogger(javaClass)

    init {
        // ID3v2.3으로 표준 고정 설정 (광범위 호환성)
        TagOptionSingleton.getInstance().apply {
            setID3V2Version(ID3V2Version.ID3_V23)
            isId3v2PaddingWillShorten = true
        }
    }

    override fun read(file: File): AudioMetadata {
        return try {
            val audioFile = AudioFileIO.read(file)
            val tag = audioFile.tagOrCreateAndSetDefault
            val header = audioFile.audioHeader

            val artworkObj = tag.artworkList.firstOrNull()

            val tagVersionStr = when (tag) {
                is ID3v24Tag -> "ID3v2.4"
                is ID3v23Tag -> "ID3v2.3"
                else -> tag.javaClass.simpleName
            }

            AudioMetadata(
                title = tag.getFirst(FieldKey.TITLE).takeIf { it.isNotBlank() },
                artist = tag.getFirst(FieldKey.ARTIST).takeIf { it.isNotBlank() },
                album = tag.getFirst(FieldKey.ALBUM).takeIf { it.isNotBlank() },
                year = tag.getFirst(FieldKey.YEAR).toIntOrNull(),
                genre = tag.getFirst(FieldKey.GENRE).takeIf { it.isNotBlank() },
                trackNumber = tag.getFirst(FieldKey.TRACK).toIntOrNull(),
                durationMs = header.trackLength.toLong() * 1000L,
                artwork = artworkObj?.binaryData,
                artworkMimeType = artworkObj?.mimeType ?: "image/jpeg",
                tagVersion = tagVersionStr
            )
        } catch (e: Exception) {
            logger.warn("오디오 메타데이터 추출 실패 (fallback 빈 메타데이터 반환): {}", e.message)
            AudioMetadata(
                title = null,
                artist = null,
                album = null,
                year = null,
                genre = null,
                trackNumber = null,
                durationMs = null,
                artwork = null,
                artworkMimeType = null,
                tagVersion = null
            )
        }
    }

    override fun read(inputStream: InputStream, extension: String): AudioMetadata {
        val tempFile = Files.createTempFile("musichub-meta-", ".$extension").toFile()
        try {
            tempFile.outputStream().use { out ->
                inputStream.copyTo(out)
            }
            return read(tempFile)
        } finally {
            if (tempFile.exists()) {
                tempFile.delete()
            }
        }
    }
}
