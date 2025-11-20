const fs = require('fs').promises;
const path = require('path');

/**
 * Conversor de arquivos MPP para XML
 * Por enquanto implementa um mock que cria XML estruturado
 */
class MPPToXMLConverter {
    constructor() {
        this.supportedExtensions = ['.mpp'];
    }

    /**
     * Converte arquivo MPP para XML
     * @param {string} inputPath - Caminho do arquivo MPP
     * @param {string} outputPath - Caminho de saída do XML
     * @returns {Promise<object>} Resultado da conversão
     */
    async convertMPPtoXML(inputPath, outputPath) {
        try {
            console.log(`🔄 Iniciando conversão: ${path.basename(inputPath)} → XML`);
            
            // Verificar se arquivo de entrada existe
            const inputExists = await this.fileExists(inputPath);
            if (!inputExists) {
                throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
            }

            // Obter informações do arquivo
            const stats = await fs.stat(inputPath);
            const fileSize = stats.size;
            
            console.log(`📊 Arquivo MPP: ${fileSize} bytes`);

            // Simular tempo de processamento baseado no tamanho
            const processingTime = Math.min(Math.max(fileSize / 1000000, 1), 10);
            await this.simulateProcessing(processingTime);

            // Gerar XML estruturado
            const xmlContent = await this.generateXMLFromMPP(inputPath, stats);
            
            // Garantir que diretório de saída existe
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });
            
            // Salvar XML
            await fs.writeFile(outputPath, xmlContent, 'utf8');
            
            const result = {
                success: true,
                inputFile: inputPath,
                outputFile: outputPath,
                inputSize: fileSize,
                outputSize: xmlContent.length,
                processingTime: processingTime,
                timestamp: new Date().toISOString()
            };

            console.log(`✅ Conversão concluída: ${path.basename(outputPath)}`);
            return result;

        } catch (error) {
            console.error(`❌ Erro na conversão:`, error);
            throw error;
        }
    }

    /**
     * Gera XML estruturado a partir do arquivo MPP
     * @param {string} inputPath 
     * @param {object} stats 
     * @returns {Promise<string>} Conteúdo XML
     */
    async generateXMLFromMPP(inputPath, stats) {
        const fileName = path.basename(inputPath, '.mpp');
        const timestamp = new Date().toISOString();
        
        // XML estruturado com informações do projeto
        const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
    <SaveVersion>14</SaveVersion>
    <Name>${fileName}</Name>
    <Title>Projeto Convertido - ${fileName}</Title>
    <Subject>Conversão de arquivo MPP para XML</Subject>
    <Category>Construção</Category>
    <Company>MPP Converter</Company>
    <Manager>Sistema Automático</Manager>
    <Author>MPP to XML Converter</Author>
    <CreationDate>${timestamp}</CreationDate>
    <LastSaved>${timestamp}</LastSaved>
    <ScheduleFromStart>1</ScheduleFromStart>
    <StartDate>${new Date().toISOString().split('T')[0]}T08:00:00</StartDate>
    <FinishDate>${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T17:00:00</FinishDate>
    
    <CalendarUID>1</CalendarUID>
    <DefaultStartTime>08:00:00</DefaultStartTime>
    <DefaultFinishTime>17:00:00</DefaultFinishTime>
    <MinutesPerDay>480</MinutesPerDay>
    <MinutesPerWeek>2400</MinutesPerWeek>
    <DaysPerMonth>20</DaysPerMonth>
    
    <Calendars>
        <Calendar>
            <UID>1</UID>
            <Name>Padrão</Name>
            <IsBaseCalendar>1</IsBaseCalendar>
            <BaseCalendarUID>-1</BaseCalendarUID>
            <WeekDays>
                <WeekDay>
                    <DayType>1</DayType>
                    <DayWorking>0</DayWorking>
                </WeekDay>
                <WeekDay>
                    <DayType>2</DayType>
                    <DayWorking>1</DayWorking>
                    <WorkingTimes>
                        <WorkingTime>
                            <FromTime>08:00:00</FromTime>
                            <ToTime>12:00:00</ToTime>
                        </WorkingTime>
                        <WorkingTime>
                            <FromTime>13:00:00</FromTime>
                            <ToTime>17:00:00</ToTime>
                        </WorkingTime>
                    </WorkingTimes>
                </WeekDay>
                <WeekDay>
                    <DayType>3</DayType>
                    <DayWorking>1</DayWorking>
                    <WorkingTimes>
                        <WorkingTime>
                            <FromTime>08:00:00</FromTime>
                            <ToTime>12:00:00</ToTime>
                        </WorkingTime>
                        <WorkingTime>
                            <FromTime>13:00:00</FromTime>
                            <ToTime>17:00:00</ToTime>
                        </WorkingTime>
                    </WorkingTimes>
                </WeekDay>
                <WeekDay>
                    <DayType>4</DayType>
                    <DayWorking>1</DayWorking>
                    <WorkingTimes>
                        <WorkingTime>
                            <FromTime>08:00:00</FromTime>
                            <ToTime>12:00:00</ToTime>
                        </WorkingTime>
                        <WorkingTime>
                            <FromTime>13:00:00</FromTime>
                            <ToTime>17:00:00</ToTime>
                        </WorkingTime>
                    </WorkingTimes>
                </WeekDay>
                <WeekDay>
                    <DayType>5</DayType>
                    <DayWorking>1</DayWorking>
                    <WorkingTimes>
                        <WorkingTime>
                            <FromTime>08:00:00</FromTime>
                            <ToTime>12:00:00</ToTime>
                        </WorkingTime>
                        <WorkingTime>
                            <FromTime>13:00:00</FromTime>
                            <ToTime>17:00:00</ToTime>
                        </WorkingTime>
                    </WorkingTimes>
                </WeekDay>
                <WeekDay>
                    <DayType>6</DayType>
                    <DayWorking>1</DayWorking>
                    <WorkingTimes>
                        <WorkingTime>
                            <FromTime>08:00:00</FromTime>
                            <ToTime>12:00:00</ToTime>
                        </WorkingTime>
                    </WorkingTimes>
                </WeekDay>
                <WeekDay>
                    <DayType>7</DayType>
                    <DayWorking>0</DayWorking>
                </WeekDay>
            </WeekDays>
        </Calendar>
    </Calendars>
    
    <Tasks>
        <Task>
            <UID>0</UID>
            <ID>0</ID>
            <Name>Projeto ${fileName}</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <CreateDate>${timestamp}</CreateDate>
            <Contact>MPP Converter</Contact>
            <WBS>0</WBS>
            <OutlineLevel>0</OutlineLevel>
            <OutlineNumber>1</OutlineNumber>
            <Priority>500</Priority>
            <Start>${new Date().toISOString()}</Start>
            <Finish>${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}</Finish>
            <Duration>PT240H0M0S</Duration>
            <ManualStart>${new Date().toISOString()}</ManualStart>
            <ManualFinish>${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}</ManualFinish>
            <ManualDuration>PT240H0M0S</ManualDuration>
            <Work>PT240H0M0S</Work>
            <IsManual>0</IsManual>
            <Summary>1</Summary>
        </Task>
        <Task>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Fase 1 - Planejamento</Name>
            <Type>0</Type>
            <IsNull>0</IsNull>
            <CreateDate>${timestamp}</CreateDate>
            <WBS>1</WBS>
            <OutlineLevel>1</OutlineLevel>
            <OutlineNumber>1.1</OutlineNumber>
            <Priority>500</Priority>
            <Start>${new Date().toISOString()}</Start>
            <Finish>${new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()}</Finish>
            <Duration>PT80H0M0S</Duration>
            <Work>PT80H0M0S</Work>
            <IsManual>0</IsManual>
        </Task>
        <Task>
            <UID>2</UID>
            <ID>2</ID>
            <Name>Fase 2 - Execução</Name>
            <Type>0</Type>
            <IsNull>0</IsNull>
            <CreateDate>${timestamp}</CreateDate>
            <WBS>2</WBS>
            <OutlineLevel>1</OutlineLevel>
            <OutlineNumber>1.2</OutlineNumber>
            <Priority>500</Priority>
            <Start>${new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()}</Start>
            <Finish>${new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()}</Finish>
            <Duration>PT120H0M0S</Duration>
            <Work>PT120H0M0S</Work>
            <IsManual>0</IsManual>
        </Task>
        <Task>
            <UID>3</UID>
            <ID>3</ID>
            <Name>Fase 3 - Finalização</Name>
            <Type>0</Type>
            <IsNull>0</IsNull>
            <CreateDate>${timestamp}</CreateDate>
            <WBS>3</WBS>
            <OutlineLevel>1</OutlineLevel>
            <OutlineNumber>1.3</OutlineNumber>
            <Priority>500</Priority>
            <Start>${new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()}</Start>
            <Finish>${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}</Finish>
            <Duration>PT40H0M0S</Duration>
            <Work>PT40H0M0S</Work>
            <IsManual>0</IsManual>
        </Task>
    </Tasks>
    
    <Resources>
        <Resource>
            <UID>1</UID>
            <ID>1</ID>
            <Name>Gerente de Projeto</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <MaxUnits>1.0</MaxUnits>
            <PeakUnits>1.0</PeakUnits>
            <OverAllocated>0</OverAllocated>
            <StandardRate>100</StandardRate>
            <OvertimeRate>150</OvertimeRate>
        </Resource>
        <Resource>
            <UID>2</UID>
            <ID>2</ID>
            <Name>Equipe Técnica</Name>
            <Type>1</Type>
            <IsNull>0</IsNull>
            <MaxUnits>3.0</MaxUnits>
            <PeakUnits>3.0</PeakUnits>
            <OverAllocated>0</OverAllocated>
            <StandardRate>80</StandardRate>
            <OvertimeRate>120</OvertimeRate>
        </Resource>
    </Resources>
    
    <Assignments>
        <Assignment>
            <UID>1</UID>
            <TaskUID>1</TaskUID>
            <ResourceUID>1</ResourceUID>
            <Units>1.0</Units>
            <Work>PT80H0M0S</Work>
            <Start>${new Date().toISOString()}</Start>
            <Finish>${new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()}</Finish>
        </Assignment>
        <Assignment>
            <UID>2</UID>
            <TaskUID>2</TaskUID>
            <ResourceUID>2</ResourceUID>
            <Units>3.0</Units>
            <Work>PT120H0M0S</Work>
            <Start>${new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()}</Start>
            <Finish>${new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()}</Finish>
        </Assignment>
        <Assignment>
            <UID>3</UID>
            <TaskUID>3</TaskUID>
            <ResourceUID>1</ResourceUID>
            <Units>1.0</Units>
            <Work>PT40H0M0S</Work>
            <Start>${new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()}</Start>
            <Finish>${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}</Finish>
        </Assignment>
    </Assignments>
    
    <ExtendedAttributes>
        <ExtendedAttribute>
            <FieldID>188744001</FieldID>
            <FieldName>Text1</FieldName>
            <Alias>Observações</Alias>
        </ExtendedAttribute>
    </ExtendedAttributes>
    
</Project>`;

        return xmlContent;
    }

    /**
     * Simula tempo de processamento
     * @param {number} seconds 
     */
    async simulateProcessing(seconds) {
        return new Promise(resolve => {
            setTimeout(resolve, seconds * 1000);
        });
    }

    /**
     * Verifica se arquivo existe
     * @param {string} filePath 
     * @returns {Promise<boolean>}
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Valida se arquivo é MPP
     * @param {string} filePath 
     * @returns {boolean}
     */
    isValidMPPFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedExtensions.includes(ext);
    }
}

module.exports = new MPPToXMLConverter();