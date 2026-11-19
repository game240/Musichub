package com.musichub.backend.domain.metadata

import org.jaudiotagger.audio.AudioFileIO
import org.jaudiotagger.tag.FieldKey
import org.jaudiotagger.tag.Tag
import org.jaudiotagger.tag.TagOptionSingleton
import org.jaudiotagger.tag.reference.ID3V2Version
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.io.File

interface MetadataWriter {
    fun updateTags(
        file: File,
        title: String?,
        artist: String?,
        album: String?,
        year: Int?,
        genre: String?,
        trackNumber: Int?,
        lyrics: String?
    )
}

@Component
class JaudiotaggerMetadataWriter : MetadataWriter {

    private val logger = LoggerFactory.getLogger(javaClass)

    init {
        TagOptionSingleton.getInstance().apply {
            setID3V2Version(ID3V2Version.ID3_V23)
            isId3v2PaddingWillShorten = true
        }
    }

    override fun updateTags(
        file: File,
        title: String?,
        artist: String?,
        album: String?,
        year: Int?,
        genre: String?,
        trackNumber: Int?,
        lyrics: String?
    ) {
        val audioFile = AudioFileIO.read(file)
        val tag = audioFile.tagOrCreateAndSetDefault

        setOrDelete(tag, FieldKey.TITLE, title)
        setOrDelete(tag, FieldKey.ARTIST, artist)
        setOrDelete(tag, FieldKey.ALBUM, album)
        setOrDelete(tag, FieldKey.YEAR, year?.toString())
        setOrDelete(tag, FieldKey.GENRE, genre)
        setOrDelete(tag, FieldKey.TRACK, trackNumber?.toString())
        setOrDelete(tag, FieldKey.LYRICS, lyrics)

        AudioFileIO.write(audioFile)
        logger.info("Successfully updated tags on file: {}", file.name)
    }

    private fun setOrDelete(tag: Tag, key: FieldKey, value: String?) {
        if (!value.isNullOrBlank()) {
            tag.setField(key, value.trim())
        } else {
            try {
                tag.deleteField(key)
            } catch (e: Exception) {
                // Ignore if field doesn't exist
            }
        }
    }
}
