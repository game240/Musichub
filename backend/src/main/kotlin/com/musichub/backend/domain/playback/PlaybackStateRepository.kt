package com.musichub.backend.domain.playback

import org.springframework.data.jpa.repository.JpaRepository

interface PlaybackStateRepository : JpaRepository<PlaybackState, Long>
