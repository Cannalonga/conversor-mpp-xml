package com.canna.converter.controller;

import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import net.sf.mpxj.ProjectFile;
import net.sf.mpxj.reader.ProjectReader;
import net.sf.mpxj.reader.UniversalProjectReader;
import net.sf.mpxj.writer.ProjectWriter;
import net.sf.mpxj.mspdi.MSPDIWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@CrossOrigin(origins = "*")
public class ConvertController {

    private static final Logger logger = LoggerFactory.getLogger(ConvertController.class);

    private final MeterRegistry meterRegistry;
    private final Counter conversionSuccessCounter;
    private final Counter conversionFailureCounter;
    private final Timer conversionTimer;

    @Autowired
    public ConvertController(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        
        // Custom metrics for MPP conversion
        this.conversionSuccessCounter = Counter.builder("mpp_conversion_total")
            .tag("status", "success")
            .description("Total successful MPP conversions")
            .register(meterRegistry);
            
        this.conversionFailureCounter = Counter.builder("mpp_conversion_total")
            .tag("status", "failure")
            .description("Total failed MPP conversions")
            .register(meterRegistry);
            
        this.conversionTimer = Timer.builder("mpp_conversion_duration_seconds")
            .description("Duration of MPP file conversion")
            .register(meterRegistry);
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("service", "mpp-converter");
        response.put("timestamp", Instant.now().toString());
        response.put("version", "1.0.0");
        return ResponseEntity.ok(response);
    }

    /**
     * Convert MPP file to MS Project XML format
     * 
     * @param file The MPP file to convert
     * @return XML content as response body
     */
    @PostMapping(
        path = "/convert",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
        produces = MediaType.APPLICATION_XML_VALUE
    )
    @Timed(value = "mpp_convert_request", description = "Time taken to process conversion request")
    public ResponseEntity<byte[]> convert(@RequestParam("file") MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        logger.info("Received conversion request for file: {}, size: {} bytes", 
            originalFilename, file.getSize());

        // Validate file
        if (file.isEmpty()) {
            logger.warn("Empty file received");
            conversionFailureCounter.increment();
            return errorResponse("File is empty", HttpStatus.BAD_REQUEST);
        }

        // Validate extension
        if (originalFilename != null && !isValidExtension(originalFilename)) {
            logger.warn("Invalid file extension: {}", originalFilename);
            conversionFailureCounter.increment();
            return errorResponse("Invalid file type. Supported: .mpp, .mpx, .xml, .mpt", 
                HttpStatus.BAD_REQUEST);
        }

        try (InputStream inputStream = file.getInputStream()) {
            long startTime = System.currentTimeMillis();

            // Use UniversalProjectReader to auto-detect file format
            ProjectReader reader = new UniversalProjectReader();
            ProjectFile project = reader.read(inputStream);

            if (project == null) {
                logger.error("Failed to read project file: {}", originalFilename);
                conversionFailureCounter.increment();
                return errorResponse("Could not read project file", HttpStatus.UNPROCESSABLE_ENTITY);
            }

            logger.info("Project loaded: {} tasks, {} resources", 
                project.getTasks().size(), 
                project.getResources().size());

            // Convert to MS Project XML (MSPDI format)
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ProjectWriter writer = new MSPDIWriter();
            writer.write(project, outputStream);

            byte[] xmlContent = outputStream.toByteArray();
            long duration = System.currentTimeMillis() - startTime;

            // Record metrics
            conversionSuccessCounter.increment();
            conversionTimer.record(duration, TimeUnit.MILLISECONDS);
            meterRegistry.gauge("mpp_conversion_file_size_bytes", file.getSize());

            logger.info("Conversion completed in {}ms, output size: {} bytes", 
                duration, xmlContent.length);

            // Build response with download headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_XML);
            
            String outputFilename = getOutputFilename(originalFilename);
            headers.setContentDisposition(
                ContentDisposition.attachment()
                    .filename(outputFilename)
                    .build()
            );
            headers.set("X-Conversion-Time-Ms", String.valueOf(duration));
            headers.set("X-Tasks-Count", String.valueOf(project.getTasks().size()));
            headers.set("X-Resources-Count", String.valueOf(project.getResources().size()));

            return new ResponseEntity<>(xmlContent, headers, HttpStatus.OK);

        } catch (Exception ex) {
            logger.error("Conversion failed for file: {}", originalFilename, ex);
            conversionFailureCounter.increment();
            return errorResponse("Conversion failed: " + ex.getMessage(), 
                HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get project info without full conversion (lightweight check)
     */
    @PostMapping(
        path = "/info",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Map<String, Object>> getProjectInfo(@RequestParam("file") MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        logger.info("Info request for file: {}", originalFilename);

        try (InputStream inputStream = file.getInputStream()) {
            ProjectReader reader = new UniversalProjectReader();
            ProjectFile project = reader.read(inputStream);

            if (project == null) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(Map.of("error", "Could not read project file"));
            }

            Map<String, Object> info = new HashMap<>();
            info.put("success", true);
            info.put("filename", originalFilename);
            info.put("projectName", project.getProjectProperties().getName());
            info.put("tasksCount", project.getTasks().size());
            info.put("resourcesCount", project.getResources().size());
            info.put("calendarsCount", project.getCalendars().size());
            info.put("startDate", project.getProjectProperties().getStartDate());
            info.put("finishDate", project.getProjectProperties().getFinishDate());

            return ResponseEntity.ok(info);

        } catch (Exception ex) {
            logger.error("Info extraction failed for file: {}", originalFilename, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", ex.getMessage()));
        }
    }

    private boolean isValidExtension(String filename) {
        String lower = filename.toLowerCase();
        return lower.endsWith(".mpp") || 
               lower.endsWith(".mpx") || 
               lower.endsWith(".xml") ||
               lower.endsWith(".mpt");
    }

    private String getOutputFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isEmpty()) {
            return "converted.xml";
        }
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            return originalFilename.substring(0, dotIndex) + ".xml";
        }
        return originalFilename + ".xml";
    }

    private ResponseEntity<byte[]> errorResponse(String message, HttpStatus status) {
        String errorXml = String.format(
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<error>\n  <message>%s</message>\n  <status>%d</status>\n</error>",
            escapeXml(message),
            status.value()
        );
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_XML);
        return new ResponseEntity<>(errorXml.getBytes(StandardCharsets.UTF_8), headers, status);
    }

    private String escapeXml(String input) {
        if (input == null) return "";
        return input
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;");
    }
}
