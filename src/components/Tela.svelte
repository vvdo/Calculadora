<script lang="ts">
    export let valor: string

    $: tamanhoFonte = valor.length > 20 ? 'pequena' : `s-${valor.length}`
</script>
<div class={`tela ${tamanhoFonte}`}>
    <span>{valor}</span>
</div>

<style>
    .tela {
        display: flex;
        flex: 1;
        justify-content: flex-end;
        align-items: center;
        padding: 0px 5px;
        font-size: 3rem;
        background-color: aliceblue;
        overflow: hidden;
        margin: 2px 1px;
        border-top-right-radius: 5px;
        border-top-left-radius: 5px;
    }

    .s-10 {font-size: 2.8rem;}
    .s-11 {font-size: 2.5rem;}
    .s-12 {font-size: 2.35rem;}
    .s-13 {font-size: 2.25rem;}
    .s-14 {font-size: 2.17rem;}
    .s-15 {font-size: 2.07rem;}
    .s-16 {font-size: 2.0rem;}
    .s-17 {font-size: 1.80rem;}
    .s-18 {font-size: 1.73rem;}
    .s-19 {font-size: 1.68rem;}
    .s-20 {font-size: 1.54rem;}

    .pequena {font-size: 1.30rem;}
</style>
