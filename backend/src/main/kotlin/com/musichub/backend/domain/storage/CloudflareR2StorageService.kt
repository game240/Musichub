package com.musichub.backend.domain.storage

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import software.amazon.awssdk.core.sync.RequestBody
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.*
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest
import java.io.InputStream
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.Duration

@Service
class CloudflareR2StorageService(
    @Value("\${musichub.storage.r2.bucket}") private val bucketName: String,
    private val s3Client: S3Client,
    private val s3Presigner: S3Presigner,
) : StorageService {

    override fun generatePresignedGetUrl(key: String, duration: Duration): String {
        val getRequest = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build()

        val presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(duration)
            .getObjectRequest(getRequest)
            .build()

        return s3Presigner.presignGetObject(presignRequest).url().toString()
    }

    override fun generatePresignedDownloadUrl(
        key: String,
        downloadFilename: String,
        duration: Duration
    ): String {
        val asciiFallback = downloadFilename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val encodedUtf8 = URLEncoder.encode(downloadFilename, StandardCharsets.UTF_8.toString())
            .replace("+", "%20")
        val contentDisposition = "attachment; filename=\"$asciiFallback\"; filename*=UTF-8''$encodedUtf8"

        val getRequest = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .responseContentDisposition(contentDisposition)
            .build()

        val presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(duration)
            .getObjectRequest(getRequest)
            .build()

        return s3Presigner.presignGetObject(presignRequest).url().toString()
    }

    override fun generatePresignedPutUrl(key: String, mimeType: String, duration: Duration): String {
        val putRequest = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .contentType(mimeType)
            .build()

        val presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(duration)
            .putObjectRequest(putRequest)
            .build()

        return s3Presigner.presignPutObject(presignRequest).url().toString()
    }

    override fun upload(key: String, inputStream: InputStream, contentLength: Long, mimeType: String) {
        val putRequest = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .contentType(mimeType)
            .contentLength(contentLength)
            .build()

        s3Client.putObject(putRequest, RequestBody.fromInputStream(inputStream, contentLength))
    }

    override fun getObject(key: String): InputStream {
        val getRequest = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build()

        return s3Client.getObject(getRequest)
    }

    override fun getMetadata(key: String): StorageObjectMetadata {
        val headRequest = HeadObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build()

        val response = s3Client.headObject(headRequest)
        return StorageObjectMetadata(
            key = key,
            contentLength = response.contentLength(),
            contentType = response.contentType()
        )
    }

    override fun delete(key: String) {
        val deleteRequest = DeleteObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build()

        s3Client.deleteObject(deleteRequest)
    }
}
