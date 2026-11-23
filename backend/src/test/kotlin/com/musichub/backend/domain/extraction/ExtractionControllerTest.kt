package com.musichub.backend.domain.extraction

import com.musichub.backend.domain.user.User
import com.musichub.backend.domain.user.UserRole
import com.musichub.backend.global.security.UserPrincipal
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.BDDMockito.given
import org.mockito.Mockito.mock

class ExtractionControllerTest {

    private lateinit var extractionService: ExtractionService
    private lateinit var extractionJobRepository: ExtractionJobRepository
    private lateinit var extractionController: ExtractionController

    private val downloaderPrincipal = UserPrincipal(id = 1L, email = "dl@test.com", role = UserRole.DOWNLOADER)
    private val testUser = User(id = 1L, email = "dl@test.com", providerId = "p1", role = UserRole.DOWNLOADER)

    @BeforeEach
    fun setUp() {
        extractionService = mock(ExtractionService::class.java)
        extractionJobRepository = mock(ExtractionJobRepository::class.java)
        extractionController = ExtractionController(extractionService, extractionJobRepository)
    }

    @Test
    @DisplayName("유효한 YouTube URL인 경우 작업 요청 성공")
    fun `requestExtraction succeeds with valid YouTube URLs`() {
        val validUrls = listOf(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "http://youtu.be/dQw4w9WgXcQ",
            "https://music.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
            "https://youtube.com/shorts/dQw4w9WgXcQ"
        )

        for (url in validUrls) {
            val job = ExtractionJob(id = 100L, user = testUser, sourceUrl = url)
            given(extractionService.createJob(1L, url)).willReturn(job)

            val response = extractionController.requestExtraction(downloaderPrincipal, ExtractionRequest(url))
            assertEquals(202, response.statusCode.value())
            assertEquals(url, response.body?.sourceUrl)
        }
    }

    @Test
    @DisplayName("유효하지 않은 URL이나 빈 값인 경우 400 에러 발생")
    fun `requestExtraction throws IllegalArgumentException on invalid URL`() {
        val invalidUrls = listOf(
            "",
            "   ",
            "https://google.com",
            "https://vimeo.com/123456",
            "not-a-url"
        )

        for (url in invalidUrls) {
            assertThrows<IllegalArgumentException> {
                extractionController.requestExtraction(downloaderPrincipal, ExtractionRequest(url))
            }
        }
    }

    @Test
    @DisplayName("작업 취소 요청 시 200 OK와 함께 취소된 DTO 반환")
    fun `cancelExtraction returns ok with cancelled job dto`() {
        val cancelledJob = ExtractionJob(id = 10L, user = testUser, sourceUrl = "https://youtube.com/watch?v=123", status = ExtractionJobStatus.CANCELLED)
        given(extractionService.cancelJob(1L, 10L)).willReturn(cancelledJob)

        val response = extractionController.cancelExtraction(downloaderPrincipal, 10L)

        assertEquals(200, response.statusCode.value())
        assertEquals(ExtractionJobStatus.CANCELLED, response.body?.status)
    }

    @Test
    @DisplayName("추출 작업 단건 삭제 시 204 No Content 반환")
    fun `deleteExtraction returns 204 no content`() {
        val response = extractionController.deleteExtraction(downloaderPrincipal, 10L)

        assertEquals(204, response.statusCode.value())
    }

    @Test
    @DisplayName("완료 및 종료된 작업 일괄 삭제 시 200 OK와 삭제 개수 반환")
    fun `clearFinishedExtractions returns 200 ok with deleted count`() {
        given(extractionService.clearFinishedJobs(1L)).willReturn(3)

        val response = extractionController.clearFinishedExtractions(downloaderPrincipal)

        assertEquals(200, response.statusCode.value())
        assertEquals(3, response.body?.get("deletedCount"))
    }
}
