const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');

/**
 * ✅ SECURE: Retorna parser XML com proteção contra XXE
 */
function getSecureXMLParser() {
    return new xml2js.Parser({
        explicitArray: false,
        
        // 🔒 XXE Protection
        strict: true,              // Modo restrito
        normalize: true,
        normalizeTags: true,
        
        // 🔒 Sem external entities
        // Nota: xml2js não suporta desabilitar completamente DOCTYPE
        // Adicionamos validação manual abaixo
        
        // Limites de tamanho
        limit: 50000000           // 50MB max
    });
}

/**
 * ✅ Valida se XML contém padrões XXE suspeitos
 */
function validateXMLForXXE(xmlContent) {
    const xxePatterns = [
        /<!DOCTYPE\s+\w+\s*\[/gi,        // DOCTYPE declaration
        /SYSTEM\s+["']file:\/\//gi,      // File system access
        /SYSTEM\s+["'].*:\/\//gi,        // Any protocol access
        /<!ENTITY\s+\w+/gi,              // Entity definition
        /&\w+;/                          // Entity reference (pode ser legítima, alertar)
    ];
    
    const findings = [];
    
    xxePatterns.forEach((pattern, idx) => {
        if (pattern.test(xmlContent)) {
            findings.push(`Padrão XXE detectado: ${pattern}`);
        }
    });
    
    return findings;
}

/**
 * Conversor de XML para MPP (Reverso)
 * Cria um arquivo simulado de Microsoft Project baseado em XML
 * NOTA: Não é uma conversão real de XML para binary .mpp (requer bibliotecas proprietárias)
 * Este conversor cria um arquivo JSON estruturado que pode ser reimportado
 */
class XMLToMppConverter {
  constructor() {
    this.supportedExtensions = ['.xml'];
    this.supportedMimeTypes = ['application/xml', 'text/xml'];
  }

  /**
   * Converte arquivo XML para MPP (simulado)
   * @param {string} inputPath - Caminho do arquivo XML
   * @param {string} outputPath - Caminho de saída do arquivo MPP
   * @param {object} options - Opções de conversão
   * @returns {Promise<object>} Resultado da conversão
   */
  async convertXmlToMpp(inputPath, outputPath, options = {}) {
    try {
      console.log(`🔄 Iniciando conversão: ${path.basename(inputPath)} → MPP (simulado)`);

      // Validar arquivo de entrada
      const inputExists = await this.fileExists(inputPath);
      if (!inputExists) {
        throw new Error(`Arquivo não encontrado: ${inputPath}`);
      }

      // Obter informações do arquivo
      const stats = await fs.stat(inputPath);
      const fileSize = stats.size;
      console.log(`📊 Tamanho do arquivo XML: ${(fileSize / 1024).toFixed(2)} KB`);

      // Ler arquivo XML
      const xmlContent = await fs.readFile(inputPath, 'utf8');

      // ✅ XXE PROTECTION: Validar XML antes de parsear
      console.log('🔍 Validando XML contra XXE...');
      const xxeFindings = validateXMLForXXE(xmlContent);
      if (xxeFindings.length > 0) {
        throw new Error(`❌ XML contém padrões suspeitos:\n${xxeFindings.join('\n')}`);
      }
      console.log('✅ XML validado - sem padrões XXE detectados');

      // ✅ Parsear com proteção XXE
      const parser = getSecureXMLParser();
      let xmlData;

      try {
        xmlData = await parser.parseStringPromise(xmlContent);
      } catch (error) {
        throw new Error(`XML inválido: ${error.message}`);
      }

      // Extrair dados do projeto
      const projectData = this._extractProjectData(xmlData);

      // Criar estrutura MPP simulada (JSON)
      // Em produção, seria necessário usar uma biblioteca como 'mpp' ou 'mpxj'
      const mppData = {
        format: 'Microsoft Project (XML to MPP)',
        convertedAt: new Date().toISOString(),
        sourceFile: path.basename(inputPath),
        project: projectData,
        metadata: {
          projectName: projectData.name || 'Projeto Convertido',
          createdDate: projectData.createdDate || new Date().toISOString(),
          createdBy: 'CannaConverter XML to MPP',
          lastSaved: new Date().toISOString(),
          version: 'MP2021',
          organization: 'CannaConverter'
        }
      };

      // Garantir que diretório de saída existe
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Escrever arquivo simulado (JSON format compatível)
      const mppContent = JSON.stringify(mppData, null, 2);
      await fs.writeFile(outputPath, mppContent, 'utf8');

      const outputStats = await fs.stat(outputPath);
      const outputSize = outputStats.size;

      console.log(`✅ Conversão concluída: ${path.basename(outputPath)}`);
      console.log(`📊 Tamanho do arquivo MPP: ${(outputSize / 1024).toFixed(2)} KB`);
      console.log(`⚠️  NOTA: Arquivo MPP é simulado (formato JSON). Para conversão real, use MPXJ.`);

      return {
        success: true,
        inputFile: path.basename(inputPath),
        outputFile: path.basename(outputPath),
        inputSize: fileSize,
        outputSize: outputSize,
        format: 'JSON (compatible with MPP structure)',
        tasksExtracted: projectData.tasks?.length || 0,
        resourcesExtracted: projectData.resources?.length || 0,
        timestamp: new Date().toISOString(),
        warning: 'Este é um arquivo MPP simulado em formato JSON. Para conversão real de XML para .mpp binário, use bibliotecas como MPXJ.'
      };

    } catch (error) {
      console.error(`❌ Erro na conversão:`, error.message);
      throw error;
    }
  }

  /**
   * Extrai dados do projeto do XML parseado
   * @private
   */
  _extractProjectData(xmlData) {
    const project = xmlData.Project || {};

    return {
      name: project.Name || project.Title || 'Sem nome',
      createdDate: project.CreatedDate || new Date().toISOString(),
      startDate: project.StartDate || new Date().toISOString(),
      finishDate: project.FinishDate || null,
      company: project.Company || '',
      manager: project.Manager || project.Manager || '',
      tasks: this._extractTasks(project.Tasks),
      resources: this._extractResources(project.Resources),
      assignments: this._extractAssignments(project.Assignments),
      rawProject: project
    };
  }

  /**
   * Extrai tarefas do XML
   * @private
   */
  _extractTasks(taskSection) {
    if (!taskSection || !taskSection.Task) {
      return [];
    }

    const tasks = Array.isArray(taskSection.Task) ? taskSection.Task : [taskSection.Task];

    return tasks.map(task => ({
      id: task.ID || task.UID,
      name: task.Name || 'Tarefa sem nome',
      startDate: task.Start,
      finishDate: task.Finish,
      duration: task.Duration,
      percentComplete: task.PercentComplete || 0,
      notes: task.Notes || '',
      priority: task.Priority || 500
    }));
  }

  /**
   * Extrai recursos do XML
   * @private
   */
  _extractResources(resourceSection) {
    if (!resourceSection || !resourceSection.Resource) {
      return [];
    }

    const resources = Array.isArray(resourceSection.Resource) 
      ? resourceSection.Resource 
      : [resourceSection.Resource];

    return resources.map(resource => ({
      id: resource.ID || resource.UID,
      name: resource.Name || 'Recurso sem nome',
      type: resource.Type || 'Resource',
      initials: resource.Initials || ''
    }));
  }

  /**
   * Extrai alocações de recursos do XML
   * @private
   */
  _extractAssignments(assignmentSection) {
    if (!assignmentSection || !assignmentSection.Assignment) {
      return [];
    }

    const assignments = Array.isArray(assignmentSection.Assignment) 
      ? assignmentSection.Assignment 
      : [assignmentSection.Assignment];

    return assignments.map(assignment => ({
      taskId: assignment.TaskID || assignment.TaskUID,
      resourceId: assignment.ResourceID || assignment.ResourceUID,
      units: assignment.Units || 100
    }));
  }

  /**
   * Verifica se arquivo existe
   * @private
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = XMLToMppConverter;
