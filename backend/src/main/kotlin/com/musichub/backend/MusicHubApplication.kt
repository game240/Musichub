package com.musichub.backend

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableAsync
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
@EnableAsync
class MusicHubApplication

fun main(args: Array<String>) {
    runApplication<MusicHubApplication>(*args)
}
